//! LAN sync server: axum HTTP server + mDNS broadcast.
//!
//! Design: article-22-app-backup.md
//! - Client is the passive LAN server (auto-starts, never initiates)
//! - App is the active client (mDNS browse + HTTP connect)
//! - Port: 52343 (LocalSend uses 52342)
//! - mDNS service: _rms-sync._tcp
//! - Auth: challenge-response (App signs nonce with seed, Client verifies)
//! - No encryption (LAN is trusted, messages are already E2E encrypted)

use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_log::log;
use tokio::sync::oneshot;

use mdns_sd::{ServiceDaemon, ServiceInfo};

/* ── constants ─────────────────────────────────────────────── */
const SYNC_PORT: u16 = 52343;
const MDNS_SERVICE_TYPE: &str = "_rms-sync._tcp";
const MDNS_INSTANCE_PREFIX: &str = "RippleMessenger";

/* ── shared state ──────────────────────────────────────────── */
static SERVER_RUNNING: AtomicBool = AtomicBool::new(false);
pub static SYNC_PUBKEY: std::sync::Mutex<Option<String>> = std::sync::Mutex::new(None);

#[derive(Default)]
struct AuthState {
    verified: std::collections::HashSet<String>,
}

/// Result of a JS-side auth crypto operation.
#[derive(Clone)]
struct AuthResult {
    ok: bool,
    nonce2: String,
    sig2: String,
}

/// Pending auth requests: request id → oneshot sender for the JS response.
static AUTH_BRIDGE: std::sync::Mutex<
    Option<std::collections::HashMap<String, oneshot::Sender<AuthResult>>>,
> = std::sync::Mutex::new(None);

fn bridge_insert(id: String, tx: oneshot::Sender<AuthResult>) {
    let mut guard = AUTH_BRIDGE.lock().unwrap();
    guard
        .get_or_insert_with(std::collections::HashMap::new)
        .insert(id, tx);
}

fn bridge_remove(id: &str) -> Option<oneshot::Sender<AuthResult>> {
    let mut guard = AUTH_BRIDGE.lock().unwrap();
    guard
        .get_or_insert_with(std::collections::HashMap::new)
        .remove(id)
}

/// Monotonic counter for unique auth request ids.
static AUTH_ID_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Result of a JS-side message verification operation.
#[derive(Clone)]
struct VerifyResult {
    ok: bool,
    valid: Vec<String>,
}

/// Pending verification requests: request id → oneshot sender for the JS response.
static VERIFY_BRIDGE: std::sync::Mutex<
    Option<std::collections::HashMap<String, oneshot::Sender<VerifyResult>>>,
> = std::sync::Mutex::new(None);

fn verify_bridge_insert(id: String, tx: oneshot::Sender<VerifyResult>) {
    let mut guard = VERIFY_BRIDGE.lock().unwrap();
    guard
        .get_or_insert_with(std::collections::HashMap::new)
        .insert(id, tx);
}

fn verify_bridge_remove(id: &str) -> Option<oneshot::Sender<VerifyResult>> {
    let mut guard = VERIFY_BRIDGE.lock().unwrap();
    guard
        .get_or_insert_with(std::collections::HashMap::new)
        .remove(id)
}

/// Monotonic counter for unique verify request ids.
static VERIFY_ID_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Result of a JS-side device query (current logged-in address).
#[derive(Clone)]
struct DeviceResult {
    address: String,
}

/// Pending device requests: request id → oneshot sender for the JS response.
static DEVICE_BRIDGE: std::sync::Mutex<
    Option<std::collections::HashMap<String, oneshot::Sender<DeviceResult>>>,
> = std::sync::Mutex::new(None);

fn device_bridge_insert(id: String, tx: oneshot::Sender<DeviceResult>) {
    let mut guard = DEVICE_BRIDGE.lock().unwrap();
    guard
        .get_or_insert_with(std::collections::HashMap::new)
        .insert(id, tx);
}

fn device_bridge_remove(id: &str) -> Option<oneshot::Sender<DeviceResult>> {
    let mut guard = DEVICE_BRIDGE.lock().unwrap();
    guard
        .get_or_insert_with(std::collections::HashMap::new)
        .remove(id)
}

/// Monotonic counter for unique device request ids.
static DEVICE_ID_COUNTER: AtomicU64 = AtomicU64::new(0);

#[derive(Clone)]
struct AppState {
    app_handle: AppHandle,
    auth: Arc<std::sync::Mutex<AuthState>>,
}

/* ── helpers ───────────────────────────────────────────────── */

/// Get the database path
fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resource_dir failed: {}", e))?;
    Ok(resource_dir.join("app.db"))
}

/// Get the file base directory
fn get_file_base_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resource_dir failed: {}", e))?;
    Ok(resource_dir.join("file"))
}

/// Build file path from hash: file/{h[0:3]}/{h[3:6]}/{hash}
fn build_file_path(base_dir: &PathBuf, hash: &str) -> PathBuf {
    let len = hash.len();
    let h1 = &hash[..len.min(3)];
    let h2 = &hash[len.min(3)..len.min(6)];
    base_dir.join(h1).join(h2).join(hash)
}

/// Auth guard
fn check_auth(
    auth: &std::sync::Mutex<AuthState>,
    account: &str,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let auth = auth.lock().unwrap();
    if auth.verified.contains(account) {
        Ok(())
    } else {
        Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "not authenticated" })),
        ))
    }
}

/* ── mDNS broadcast ────────────────────────────────────────── */
/// Get the local machine's hostname as a `.local.` mDNS name.
fn mdns_hostname() -> String {
    let host = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "localhost".to_string());
    format!("{}.local.", host)
}

/// Get the LAN IP address (the one other devices will connect to).
/// Uses the UDP-connect trick: bind to 0.0.0.0, "connect" to a public
/// address (no packets sent), then read back the local endpoint.
fn mdns_local_ip() -> String {
    if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = socket.local_addr() {
                return addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}

fn start_mdns_broadcast(address: &str) -> Result<(), String> {
    let daemon = ServiceDaemon::new().map_err(|e| format!("mDNS daemon failed: {}", e))?;

    let instance = format!(
        "{}-{}",
        MDNS_INSTANCE_PREFIX,
        &address[..8.min(address.len())]
    );
    let mut txt = std::collections::HashMap::new();
    txt.insert("addr".to_string(), address.to_string());
    txt.insert("v".to_string(), "1".to_string());

    // mdns-sd 0.11 ServiceInfo::new signature:
    //   (ty_domain, my_name, host_name, ip, port, properties)
    // ty_domain  = "_rms-sync._tcp.local."
    // my_name    = instance name (no service-type suffix)
    // host_name  = must end with ".local."
    // ip         = LAN IP other devices connect to
    let ty_domain = format!("{}.local.", MDNS_SERVICE_TYPE);
    let host_name = mdns_hostname();
    let ip = mdns_local_ip();

    let info = ServiceInfo::new(&ty_domain, &instance, &host_name, &ip, SYNC_PORT, txt)
        .map_err(|e| format!("mDNS service info failed: {}", e))?;

    daemon
        .register(info)
        .map_err(|e| format!("mDNS register failed: {}", e))?;

    log::info!(
        "[SyncServer] mDNS broadcasting: {} port {} ip {}",
        instance,
        SYNC_PORT,
        ip
    );
    Ok(())
}

/* ── HTTP handlers ─────────────────────────────────────────── */

/// GET /v1/device → list of accounts on this device
async fn get_device(state: State<AppState>) -> impl IntoResponse {
    let db_path = match get_db_path(&state.app_handle) {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            );
        }
    };

    // Query accounts table
    let db_addresses: Vec<String> = {
        let mut addrs = Vec::new();
        if let Ok(conn) = rusqlite::Connection::open(&db_path) {
            if let Ok(mut stmt) = conn.prepare("SELECT address FROM accounts") {
                if let Ok(rows) = stmt.query_map([], |row| row.get::<_, String>(0)) {
                    for a in rows.flatten() {
                        addrs.push(a);
                    }
                }
            }
        }
        addrs
    };

    // Also query JS for the current logged-in address (not in accounts table)
    let js_address: Option<String> = async {
        let id = format!(
            "dev-{}",
            DEVICE_ID_COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst)
        );
        let (tx, rx) = oneshot::channel::<DeviceResult>();
        device_bridge_insert(id.clone(), tx);

        let payload = serde_json::json!({ "id": id });
        if let Err(e) = state.app_handle.emit("sync-device-request", payload) {
            device_bridge_remove(&id);
            eprintln!("[SyncServer] emit sync-device-request failed: {}", e);
            return None;
        }

        // Wait up to 3 seconds for JS response
        let result = tokio::time::timeout(std::time::Duration::from_secs(3), rx).await;
        match result {
            Ok(Ok(dev)) => Some(dev.address),
            _ => {
                device_bridge_remove(&id);
                None
            }
        }
    }
    .await;

    // Merge: accounts table + JS logged-in address (dedup)
    let mut all_addresses = db_addresses;
    if let Some(ref js_addr) = js_address {
        if !all_addresses.contains(js_addr) {
            all_addresses.push(js_addr.clone());
        }
    }

    let pubkey = SYNC_PUBKEY.lock().unwrap().clone().unwrap_or_default();
    let account_list: Vec<serde_json::Value> = all_addresses
        .iter()
        .map(|addr| {
            serde_json::json!({
                "address": addr,
                "pubkey": pubkey
            })
        })
        .collect();

    (
        StatusCode::OK,
        Json(serde_json::json!({ "accounts": account_list })),
    )
}

/// POST /v1/auth → challenge-response auth
#[derive(Deserialize)]
struct AuthRequest {
    account: String,
    nonce: String,
    sig: String,
}

async fn post_auth(
    State(state): State<AppState>,
    Json(req): Json<AuthRequest>,
) -> impl IntoResponse {
    // Generate a unique request id
    let id = format!("auth-{}", AUTH_ID_COUNTER.fetch_add(1, Ordering::SeqCst));

    let (tx, rx) = oneshot::channel::<AuthResult>();
    bridge_insert(id.clone(), tx);

    // Ask the JS layer to do the crypto (verify App sig + sign nonce2)
    let payload = serde_json::json!({
        "id": id,
        "account": req.account,
        "nonce": req.nonce,
        "sig": req.sig,
    });

    if let Err(e) = state.app_handle.emit("sync-auth-request", payload) {
        bridge_remove(&id);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "ok": false, "error": format!("emit failed: {}", e) })),
        );
    }

    // Await the JS response (5s timeout)
    let result = tokio::time::timeout(Duration::from_secs(5), rx).await;

    match result {
        Ok(Ok(auth)) if auth.ok => {
            state
                .auth
                .lock()
                .unwrap()
                .verified
                .insert(req.account.clone());
            (
                StatusCode::OK,
                Json(serde_json::json!({ "ok": true, "nonce2": auth.nonce2, "sig2": auth.sig2 })),
            )
        }
        _ => (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "ok": false, "error": "auth failed" })),
        ),
    }
}

/// JS → Rust: deliver the auth crypto result for a pending request.
/// Called from the JS `sync-auth-request` listener after it verifies the App's
/// signature and signs a fresh nonce2.
#[tauri::command]
pub fn sync_auth_response(id: String, ok: bool, nonce2: String, sig2: String) {
    if let Some(sender) = bridge_remove(&id) {
        let _ = sender.send(AuthResult { ok, nonce2, sig2 });
    }
}

/// JS → Rust: deliver the verification result for a pending request.
/// Called from the JS `sync-verify-request` listener after it runs schema +
/// signature checks on each pushed message.
#[tauri::command]
pub fn sync_verify_response(id: String, ok: bool, valid: Vec<String>) {
    if let Some(sender) = verify_bridge_remove(&id) {
        let _ = sender.send(VerifyResult { ok, valid });
    }
}

/// JS → Rust: deliver the current logged-in address for a pending device request.
#[tauri::command]
pub fn sync_device_response(id: String, address: String) {
    if let Some(sender) = device_bridge_remove(&id) {
        let _ = sender.send(DeviceResult { address });
    }
}

/// Ask the JS layer to verify a batch of message JSON strings (schema + signature).
/// Returns the list of message hashes that passed verification.
async fn verify_messages(
    app_handle: &AppHandle,
    kind: &str,
    items: &[(String, String)],
) -> Result<Vec<String>, String> {
    if items.is_empty() {
        return Ok(Vec::new());
    }

    let id = format!(
        "verify-{}",
        VERIFY_ID_COUNTER.fetch_add(1, Ordering::SeqCst)
    );
    let (tx, rx) = oneshot::channel::<VerifyResult>();
    verify_bridge_insert(id.clone(), tx);

    let payload = serde_json::json!({
        "id": id,
        "kind": kind,
        "items": items.iter().map(|(h, j)| serde_json::json!({ "hash": h, "json": j })).collect::<Vec<_>>(),
    });

    if let Err(e) = app_handle.emit("sync-verify-request", payload) {
        verify_bridge_remove(&id);
        return Err(format!("emit failed: {}", e));
    }

    match tokio::time::timeout(Duration::from_secs(30), rx).await {
        Ok(Ok(r)) if r.ok => Ok(r.valid),
        Ok(Ok(_)) => Err("verification rejected by JS layer".to_string()),
        Ok(Err(_)) => Err("verification bridge closed".to_string()),
        Err(_) => Err("verification timed out (30s)".to_string()),
    }
}

/// Basic XRPL address sanity check: base58 charset, starts with 'r', 33-35 chars.
fn is_valid_xrpl_address(s: &str) -> bool {
    const B58: &str = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    s.len() >= 33
        && s.len() <= 35
        && s.starts_with('r')
        && s.bytes().all(|b| B58.as_bytes().contains(&b))
}

/// GET /v1/account/{addr}/state → reconciliation state
async fn get_state(State(state): State<AppState>, Path(addr): Path<String>) -> impl IntoResponse {
    if let Err(e) = check_auth(&state.auth, &addr) {
        return e;
    }

    let db_path = match get_db_path(&state.app_handle) {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            );
        }
    };

    let result: Result<serde_json::Value, String> = async {
        let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

        // Private messages: max sequence per peer
        let mut private = serde_json::Map::new();
        {
            let mut stmt = conn
                .prepare(
                    "SELECT dest, MAX(sequence) FROM private_messages WHERE sour = ?1 GROUP BY dest
                     UNION
                     SELECT sour, MAX(sequence) FROM private_messages WHERE dest = ?1 GROUP BY sour",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([addr.as_str()], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
                })
                .map_err(|e| e.to_string())?;
            for row in rows {
                let (peer, seq) = row.map_err(|e| e.to_string())?;
                private.insert(peer, serde_json::json!(seq));
            }
        }

        // Group messages: max sequence per group
        let mut groups = serde_json::Map::new();
        {
            let mut stmt = conn
                .prepare(
                    "SELECT gm.group_hash, MAX(gm.sequence) FROM group_messages gm
                     JOIN groups g ON gm.group_hash = g.hash
                     WHERE g.member = ?1
                     GROUP BY gm.group_hash",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([addr.as_str()], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
                })
                .map_err(|e| e.to_string())?;
            for row in rows {
                let (ghash, seq) = row.map_err(|e| e.to_string())?;
                groups.insert(ghash, serde_json::json!(seq));
            }
        }

        // Files: list of hashes
        let mut file_hashes: Vec<String> = Vec::new();
        {
            let mut stmt = conn
                .prepare("SELECT hash FROM files WHERE is_saved = 1")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([], |row| row.get::<_, String>(0))
                .map_err(|e| e.to_string())?;
            for row in rows {
                file_hashes.push(row.map_err(|e| e.to_string())?);
            }
        }

        // Metadata: contacts, friends, follows
        let mut contacts: Vec<serde_json::Value> = Vec::new();
        {
            let mut stmt = conn
                .prepare("SELECT address, nickname FROM contacts")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                })
                .map_err(|e| e.to_string())?;
            for row in rows {
                let (a, n) = row.map_err(|e| e.to_string())?;
                contacts.push(serde_json::json!({ "address": a, "nickname": n }));
            }
        }

        let mut friends: Vec<String> = Vec::new();
        {
            let mut stmt = conn
                .prepare("SELECT remote FROM friends WHERE local = ?1")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([addr.as_str()], |row| row.get::<_, String>(0))
                .map_err(|e| e.to_string())?;
            for row in rows {
                friends.push(row.map_err(|e| e.to_string())?);
            }
        }

        let mut follows: Vec<String> = Vec::new();
        {
            let mut stmt = conn
                .prepare("SELECT remote FROM follows WHERE local = ?1")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([addr.as_str()], |row| row.get::<_, String>(0))
                .map_err(|e| e.to_string())?;
            for row in rows {
                follows.push(row.map_err(|e| e.to_string())?);
            }
        }

        Ok(serde_json::json!({
            "private": private,
            "groups": groups,
            "files": file_hashes,
            "metadata": {
                "contacts": contacts,
                "friends": friends,
                "follows": follows,
            }
        }))
    }
    .await;

    match result {
        Ok(data) => (StatusCode::OK, Json(data)),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        ),
    }
}

/// GET /v1/account/{addr}/private/{peer}/messages
#[derive(Deserialize)]
struct MsgQuery {
    after_seq: Option<i64>,
}

async fn get_private_messages(
    State(state): State<AppState>,
    Path((addr, peer)): Path<(String, String)>,
    Query(q): Query<MsgQuery>,
) -> impl IntoResponse {
    let _ = &peer; // used in query below
    if let Err(e) = check_auth(&state.auth, &addr) {
        return e;
    }

    let db_path = match get_db_path(&state.app_handle) {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            );
        }
    };

    let after_seq = q.after_seq.unwrap_or(0);

    let result: Result<Vec<serde_json::Value>, String> = async {
        let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT hash, sour, dest, sequence, pre_hash, content, json, signed_at,
                        is_confirmed, is_marked, is_readed, is_object, object_type
                 FROM private_messages
                 WHERE ((sour = ?1 AND dest = ?2) OR (sour = ?2 AND dest = ?1))
                   AND sequence > ?3
                 ORDER BY sequence ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![addr, peer, after_seq], |row| {
                Ok(serde_json::json!({
                    "hash": row.get::<_, String>(0)?,
                    "sour": row.get::<_, String>(1)?,
                    "dest": row.get::<_, String>(2)?,
                    "sequence": row.get::<_, i64>(3)?,
                    "pre_hash": row.get::<_, String>(4)?,
                    "content": row.get::<_, String>(5)?,
                    "json": row.get::<_, String>(6)?,
                    "signed_at": row.get::<_, i64>(7)?,
                    "is_confirmed": row.get::<_, i32>(8)?,
                    "is_marked": row.get::<_, i32>(9)?,
                    "is_readed": row.get::<_, i32>(10)?,
                    "is_object": row.get::<_, i32>(11)?,
                    "object_type": row.get::<_, i32>(12)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        let mut messages = Vec::new();
        for row in rows {
            messages.push(row.map_err(|e| e.to_string())?);
        }
        Ok(messages)
    }
    .await;

    match result {
        Ok(messages) => (
            StatusCode::OK,
            Json(serde_json::json!({ "messages": messages })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        ),
    }
}

/// POST /v1/account/{addr}/private/{peer}/messages
async fn post_private_messages(
    State(state): State<AppState>,
    Path((addr, _peer)): Path<(String, String)>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    if let Err(e) = check_auth(&state.auth, &addr) {
        return e;
    }

    let db_path = match get_db_path(&state.app_handle) {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            );
        }
    };

    let messages = match body.get("messages").and_then(|m| m.as_array()) {
        Some(m) => m.clone(),
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "missing messages array" })),
            );
        }
    };

    // Verify each message (schema + signature) via the JS bridge
    let items: Vec<(String, String)> = messages
        .iter()
        .map(|m| {
            let hash = m
                .get("hash")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let json_str = m.get("json").map(|v| v.to_string()).unwrap_or_default();
            (hash, json_str)
        })
        .collect();
    let valid_set: std::collections::HashSet<String> =
        match verify_messages(&state.app_handle, "private", &items).await {
            Ok(v) => v.into_iter().collect(),
            Err(e) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "ok": false, "error": e })),
                );
            }
        };

    let result: Result<serde_json::Value, String> = async {
        let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
        let mut imported = 0;
        let mut skipped = 0;
        let mut errors: Vec<String> = Vec::new();
        for msg in &messages {
            let hash = msg.get("hash").and_then(|v| v.as_str()).unwrap_or("");
            if !valid_set.contains(hash) {
                skipped += 1;
                errors.push(format!("{}: verification failed", hash));
                continue;
            }
            let sour = msg.get("sour").and_then(|v| v.as_str()).unwrap_or("");
            let dest = msg.get("dest").and_then(|v| v.as_str()).unwrap_or("");
            let sequence = msg.get("sequence").and_then(|v| v.as_i64()).unwrap_or(0);
            let pre_hash = msg.get("pre_hash").and_then(|v| v.as_str()).unwrap_or("");
            let content = msg.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let json_str = msg.get("json").map(|v| v.to_string()).unwrap_or_else(|| "{}".to_string());
            let signed_at = msg.get("signed_at").and_then(|v| v.as_i64()).unwrap_or(0);
            let is_confirmed = msg.get("is_confirmed").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let is_marked = msg.get("is_marked").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let is_readed = msg.get("is_readed").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let is_object = msg.get("is_object").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let object_type = msg.get("object_type").and_then(|v| v.as_i64()).unwrap_or(0) as i32;

            conn.execute(
                "INSERT OR IGNORE INTO private_messages
                 (hash, sour, dest, sequence, pre_hash, content, json, signed_at,
                  is_confirmed, is_marked, is_readed, is_object, object_type)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                rusqlite::params![
                    hash, sour, dest, sequence, pre_hash, content, json_str, signed_at,
                    is_confirmed, is_marked, is_readed, is_object, object_type
                ],
            )
            .map_err(|e| e.to_string())?;
            imported += 1;
        }
        Ok(serde_json::json!({ "ok": true, "imported": imported, "skipped": skipped, "errors": errors }))
    }
    .await;

    match result {
        Ok(data) => (StatusCode::OK, Json(data)),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "ok": false, "error": e })),
        ),
    }
}

/// GET /v1/account/{addr}/group/{hash}/messages
async fn get_group_messages(
    State(state): State<AppState>,
    Path((addr, hash)): Path<(String, String)>,
    Query(q): Query<MsgQuery>,
) -> impl IntoResponse {
    let _ = &hash; // used in query below
    if let Err(e) = check_auth(&state.auth, &addr) {
        return e;
    }

    let db_path = match get_db_path(&state.app_handle) {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            );
        }
    };

    let after_seq = q.after_seq.unwrap_or(0);

    let result: Result<Vec<serde_json::Value>, String> = async {
        let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT hash, group_hash, address, sequence, pre_hash, content, json, signed_at,
                        is_confirmed, is_marked, is_readed, is_object, object_type
                 FROM group_messages
                 WHERE group_hash = ?1 AND sequence > ?2
                 ORDER BY sequence ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![hash, after_seq], |row| {
                Ok(serde_json::json!({
                    "hash": row.get::<_, String>(0)?,
                    "group_hash": row.get::<_, String>(1)?,
                    "address": row.get::<_, String>(2)?,
                    "sequence": row.get::<_, i64>(3)?,
                    "pre_hash": row.get::<_, String>(4)?,
                    "content": row.get::<_, String>(5)?,
                    "json": row.get::<_, String>(6)?,
                    "signed_at": row.get::<_, i64>(7)?,
                    "is_confirmed": row.get::<_, i32>(8)?,
                    "is_marked": row.get::<_, i32>(9)?,
                    "is_readed": row.get::<_, i32>(10)?,
                    "is_object": row.get::<_, i32>(11)?,
                    "object_type": row.get::<_, i32>(12)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        let mut messages = Vec::new();
        for row in rows {
            messages.push(row.map_err(|e| e.to_string())?);
        }
        Ok(messages)
    }
    .await;

    match result {
        Ok(messages) => (
            StatusCode::OK,
            Json(serde_json::json!({ "messages": messages })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        ),
    }
}

/// POST /v1/account/{addr}/group/{hash}/messages
async fn post_group_messages(
    State(state): State<AppState>,
    Path((addr, _hash)): Path<(String, String)>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    if let Err(e) = check_auth(&state.auth, &addr) {
        return e;
    }

    let db_path = match get_db_path(&state.app_handle) {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            );
        }
    };

    let messages = match body.get("messages").and_then(|m| m.as_array()) {
        Some(m) => m.clone(),
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "missing messages array" })),
            );
        }
    };

    // Verify each message (schema + signature) via the JS bridge
    let items: Vec<(String, String)> = messages
        .iter()
        .map(|m| {
            let hash = m
                .get("hash")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let json_str = m
                .get("json")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            (hash, json_str)
        })
        .collect();
    let valid_set: std::collections::HashSet<String> =
        match verify_messages(&state.app_handle, "group", &items).await {
            Ok(v) => v.into_iter().collect(),
            Err(e) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "ok": false, "error": e })),
                );
            }
        };

    let result: Result<serde_json::Value, String> = async {
        let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
        let mut imported = 0;
        let mut skipped = 0;
        let mut errors: Vec<String> = Vec::new();
        for msg in &messages {
            let mhash = msg.get("hash").and_then(|v| v.as_str()).unwrap_or("");
            if !valid_set.contains(mhash) {
                skipped += 1;
                errors.push(format!("{}: verification failed", mhash));
                continue;
            }
            let ghash = msg.get("group_hash").and_then(|v| v.as_str()).unwrap_or("");
            let address = msg.get("address").and_then(|v| v.as_str()).unwrap_or("");
            let sequence = msg.get("sequence").and_then(|v| v.as_i64()).unwrap_or(0);
            let pre_hash = msg.get("pre_hash").and_then(|v| v.as_str()).unwrap_or("");
            let content = msg.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let json_str = msg.get("json").and_then(|v| v.as_str()).unwrap_or("{}");
            let signed_at = msg.get("signed_at").and_then(|v| v.as_i64()).unwrap_or(0);
            let is_confirmed = msg.get("is_confirmed").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let is_marked = msg.get("is_marked").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let is_readed = msg.get("is_readed").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let is_object = msg.get("is_object").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let object_type = msg.get("object_type").and_then(|v| v.as_i64()).unwrap_or(0) as i32;

            conn.execute(
                "INSERT OR IGNORE INTO group_messages
                 (hash, group_hash, address, sequence, pre_hash, content, json, signed_at,
                  is_confirmed, is_marked, is_readed, is_object, object_type)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                rusqlite::params![
                    mhash, ghash, address, sequence, pre_hash, content, json_str, signed_at,
                    is_confirmed, is_marked, is_readed, is_object, object_type
                ],
            )
            .map_err(|e| e.to_string())?;
            imported += 1;
        }
        Ok(serde_json::json!({ "ok": true, "imported": imported, "skipped": skipped, "errors": errors }))
    }
    .await;

    match result {
        Ok(data) => (StatusCode::OK, Json(data)),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "ok": false, "error": e })),
        ),
    }
}

/// GET /v1/account/{addr}/groups
async fn get_groups(State(state): State<AppState>, Path(addr): Path<String>) -> impl IntoResponse {
    if let Err(e) = check_auth(&state.auth, &addr) {
        return e;
    }

    let db_path = match get_db_path(&state.app_handle) {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            );
        }
    };

    let result: Result<Vec<serde_json::Value>, String> = async {
        let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT hash, name, created_by, member, created_at, create_json,
                        deleted_at, delete_json, is_accepted
                 FROM groups WHERE member = ?1",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([addr.as_str()], |row| {
                Ok(serde_json::json!({
                    "hash": row.get::<_, String>(0)?,
                    "name": row.get::<_, String>(1)?,
                    "created_by": row.get::<_, String>(2)?,
                    "member": row.get::<_, String>(3)?,
                    "created_at": row.get::<_, i64>(4)?,
                    "create_json": row.get::<_, String>(5)?,
                    "deleted_at": row.get::<_, Option<i64>>(6)?,
                    "delete_json": row.get::<_, Option<String>>(7)?,
                    "is_accepted": row.get::<_, i32>(8)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        let mut groups = Vec::new();
        for row in rows {
            groups.push(row.map_err(|e| e.to_string())?);
        }
        Ok(groups)
    }
    .await;

    match result {
        Ok(groups) => (
            StatusCode::OK,
            Json(serde_json::json!({ "groups": groups })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        ),
    }
}

/// POST /v1/account/{addr}/groups
async fn post_groups(
    State(state): State<AppState>,
    Path(addr): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    if let Err(e) = check_auth(&state.auth, &addr) {
        return e;
    }

    let db_path = match get_db_path(&state.app_handle) {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            );
        }
    };

    let groups = match body.get("groups").and_then(|g| g.as_array()) {
        Some(g) => g.clone(),
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "missing groups array" })),
            );
        }
    };

    let result: Result<serde_json::Value, String> = async {
        let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
        let mut imported = 0;
        let mut skipped = 0;
        let mut errors: Vec<String> = Vec::new();
        for g in &groups {
            let ghash = g.get("hash").and_then(|v| v.as_str()).unwrap_or("");
            let name = g.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let created_by = g.get("created_by").and_then(|v| v.as_str()).unwrap_or("");
            let member = g.get("member").and_then(|v| v.as_str()).unwrap_or("");
            if ghash.is_empty() || !is_valid_xrpl_address(created_by) || member.is_empty() {
                skipped += 1;
                errors.push(format!("group: invalid hash/created_by/member (hash='{}', created_by='{}')", ghash, created_by));
                continue;
            }
            let created_at = g.get("created_at").and_then(|v| v.as_i64()).unwrap_or(0);
            let create_json = g.get("create_json").and_then(|v| v.as_str()).unwrap_or("{}");
            let deleted_at = g.get("deleted_at").and_then(|v| v.as_i64());
            let delete_json = g.get("delete_json").and_then(|v| v.as_str());
            let is_accepted = g.get("is_accepted").and_then(|v| v.as_i64()).unwrap_or(0) as i32;

            conn.execute(
                "INSERT OR REPLACE INTO groups
                 (hash, name, created_by, member, created_at, create_json,
                  deleted_at, delete_json, is_accepted)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                rusqlite::params![
                    ghash, name, created_by, member, created_at, create_json,
                    deleted_at, delete_json, is_accepted
                ],
            )
            .map_err(|e| e.to_string())?;
            imported += 1;
        }
        Ok(serde_json::json!({ "ok": true, "imported": imported, "skipped": skipped, "errors": errors }))
    }
    .await;

    match result {
        Ok(data) => (StatusCode::OK, Json(data)),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "ok": false, "error": e })),
        ),
    }
}

/// GET /v1/account/{addr}/metadata
async fn get_metadata(
    State(state): State<AppState>,
    Path(addr): Path<String>,
) -> impl IntoResponse {
    if let Err(e) = check_auth(&state.auth, &addr) {
        return e;
    }

    let db_path = match get_db_path(&state.app_handle) {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            );
        }
    };

    let result: Result<serde_json::Value, String> = async {
        let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

        let mut contacts: Vec<serde_json::Value> = Vec::new();
        {
            let mut stmt = conn
                .prepare("SELECT address, nickname, updated_at FROM contacts")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, i64>(2)?,
                    ))
                })
                .map_err(|e| e.to_string())?;
            for row in rows {
                let (a, n, u) = row.map_err(|e| e.to_string())?;
                contacts.push(serde_json::json!({ "address": a, "nickname": n, "updated_at": u }));
            }
        }

        let mut friends: Vec<serde_json::Value> = Vec::new();
        {
            let mut stmt = conn
                .prepare("SELECT remote, updated_at, is_deleted FROM friends WHERE local = ?1")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([addr.as_str()], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, i64>(1)?,
                        row.get::<_, i64>(2)?,
                    ))
                })
                .map_err(|e| e.to_string())?;
            for row in rows {
                let (r, u, d) = row.map_err(|e| e.to_string())?;
                friends.push(serde_json::json!({ "remote": r, "updated_at": u, "is_deleted": d }));
            }
        }

        let mut follows: Vec<serde_json::Value> = Vec::new();
        {
            let mut stmt = conn
                .prepare("SELECT remote, updated_at, is_deleted FROM follows WHERE local = ?1")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([addr.as_str()], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, i64>(1)?,
                        row.get::<_, i64>(2)?,
                    ))
                })
                .map_err(|e| e.to_string())?;
            for row in rows {
                let (r, u, d) = row.map_err(|e| e.to_string())?;
                follows.push(serde_json::json!({ "remote": r, "updated_at": u, "is_deleted": d }));
            }
        }

        Ok(serde_json::json!({
            "contacts": contacts,
            "friends": friends,
            "follows": follows,
        }))
    }
    .await;

    match result {
        Ok(data) => (StatusCode::OK, Json(data)),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        ),
    }
}

/// POST /v1/account/{addr}/metadata
async fn post_metadata(
    State(state): State<AppState>,
    Path(addr): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    if let Err(e) = check_auth(&state.auth, &addr) {
        return e;
    }

    let db_path = match get_db_path(&state.app_handle) {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            );
        }
    };

    let result: Result<serde_json::Value, String> = async {
        let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
        let mut imported = 0;
        let mut skipped = 0;
        let mut errors: Vec<String> = Vec::new();

        // Contacts
        if let Some(contacts) = body.get("contacts").and_then(|c| c.as_array()) {
            for c in contacts {
                let a = c.get("address").and_then(|v| v.as_str()).unwrap_or("");
                if !is_valid_xrpl_address(a) {
                    skipped += 1;
                    errors.push(format!("contact: invalid address '{}'", a));
                    continue;
                }
                let n = c.get("nickname").and_then(|v| v.as_str()).unwrap_or("");
                let u = c.get("updated_at").and_then(|v| v.as_i64()).unwrap_or(0);
                conn.execute(
                    "INSERT OR REPLACE INTO contacts (address, nickname, updated_at) VALUES (?1, ?2, ?3)",
                    rusqlite::params![a, n, u],
                )
                .map_err(|e| e.to_string())?;
                imported += 1;
            }
        }

        // Friends
        if let Some(friends) = body.get("friends").and_then(|f| f.as_array()) {
            for f in friends {
                let r = f.get("remote").and_then(|v| v.as_str()).unwrap_or("");
                if !is_valid_xrpl_address(r) {
                    skipped += 1;
                    errors.push(format!("friend: invalid address '{}'", r));
                    continue;
                }
                let u = f.get("updated_at").and_then(|v| v.as_i64()).unwrap_or(0);
                let d = f.get("is_deleted").and_then(|v| v.as_i64()).unwrap_or(0);
                conn.execute(
                    "INSERT INTO friends (local, remote, updated_at, is_deleted) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(local, remote) DO UPDATE SET is_deleted = ?4, updated_at = ?3",
                    rusqlite::params![addr, r, u, d],
                )
                .map_err(|e| e.to_string())?;
                imported += 1;
            }
        }

        // Follows
        if let Some(follows) = body.get("follows").and_then(|f| f.as_array()) {
            for f in follows {
                let r = f.get("remote").and_then(|v| v.as_str()).unwrap_or("");
                if !is_valid_xrpl_address(r) {
                    skipped += 1;
                    errors.push(format!("follow: invalid address '{}'", r));
                    continue;
                }
                let u = f.get("updated_at").and_then(|v| v.as_i64()).unwrap_or(0);
                let d = f.get("is_deleted").and_then(|v| v.as_i64()).unwrap_or(0);
                conn.execute(
                    "INSERT INTO follows (local, remote, updated_at, is_deleted) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(local, remote) DO UPDATE SET is_deleted = ?4, updated_at = ?3",
                    rusqlite::params![addr, r, u, d],
                )
                .map_err(|e| e.to_string())?;
                imported += 1;
            }
        }

        Ok(serde_json::json!({ "ok": true, "imported": imported, "skipped": skipped, "errors": errors }))
    }
    .await;

    match result {
        Ok(data) => (StatusCode::OK, Json(data)),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "ok": false, "error": e })),
        ),
    }
}

/// GET /v1/account/{addr}/handshakes
async fn get_handshakes(
    State(state): State<AppState>,
    Path(addr): Path<String>,
) -> impl IntoResponse {
    if let Err(e) = check_auth(&state.auth, &addr) {
        return e;
    }

    let db_path = match get_db_path(&state.app_handle) {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            );
        }
    };

    let result: Result<Vec<serde_json::Value>, String> = async {
        let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT self_address, pair_address, partition, sequence,
                        aes_key, private_key, public_key, self_json, pair_json
                 FROM handshakes WHERE self_address = ?1",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([addr.as_str()], |row| {
                Ok(serde_json::json!({
                    "self_address": row.get::<_, String>(0)?,
                    "pair_address": row.get::<_, String>(1)?,
                    "partition": row.get::<_, i64>(2)?,
                    "sequence": row.get::<_, i64>(3)?,
                    "aes_key": row.get::<_, Option<String>>(4)?,
                    "private_key": row.get::<_, String>(5)?,
                    "public_key": row.get::<_, String>(6)?,
                    "self_json": row.get::<_, String>(7)?,
                    "pair_json": row.get::<_, Option<String>>(8)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        let mut handshakes = Vec::new();
        for row in rows {
            handshakes.push(row.map_err(|e| e.to_string())?);
        }
        Ok(handshakes)
    }
    .await;

    match result {
        Ok(handshakes) => (
            StatusCode::OK,
            Json(serde_json::json!({ "handshakes": handshakes })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        ),
    }
}

/// POST /v1/account/{addr}/handshakes
async fn post_handshakes(
    State(state): State<AppState>,
    Path(addr): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    if let Err(e) = check_auth(&state.auth, &addr) {
        return e;
    }

    let db_path = match get_db_path(&state.app_handle) {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            );
        }
    };

    let handshakes = match body.get("handshakes").and_then(|h| h.as_array()) {
        Some(h) => h.clone(),
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "missing handshakes array" })),
            );
        }
    };

    let result: Result<serde_json::Value, String> = async {
        let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
        let mut imported = 0;
        let mut skipped = 0;
        let mut errors: Vec<String> = Vec::new();
        for h in &handshakes {
            let self_addr = h.get("self_address").and_then(|v| v.as_str()).unwrap_or("");
            let pair_addr = h.get("pair_address").and_then(|v| v.as_str()).unwrap_or("");
            // self_address must be the authenticated account; pair must be a valid address
            if self_addr != addr || !is_valid_xrpl_address(pair_addr) {
                skipped += 1;
                errors.push(format!("handshake: invalid self/pair (self='{}', pair='{}')", self_addr, pair_addr));
                continue;
            }
            let partition = h.get("partition").and_then(|v| v.as_i64()).unwrap_or(0);
            let sequence = h.get("sequence").and_then(|v| v.as_i64()).unwrap_or(0);
            let aes_key = h.get("aes_key").and_then(|v| v.as_str());
            let private_key = h.get("private_key").and_then(|v| v.as_str()).unwrap_or("");
            let public_key = h.get("public_key").and_then(|v| v.as_str()).unwrap_or("");
            let self_json = h.get("self_json").and_then(|v| v.as_str()).unwrap_or("{}");
            let pair_json = h.get("pair_json").and_then(|v| v.as_str());

            conn.execute(
                "INSERT OR REPLACE INTO handshakes
                 (self_address, pair_address, partition, sequence,
                  aes_key, private_key, public_key, self_json, pair_json)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                rusqlite::params![
                    self_addr, pair_addr, partition, sequence,
                    aes_key, private_key, public_key, self_json, pair_json
                ],
            )
            .map_err(|e| e.to_string())?;
            imported += 1;
        }
        Ok(serde_json::json!({ "ok": true, "imported": imported, "skipped": skipped, "errors": errors }))
    }
    .await;

    match result {
        Ok(data) => (StatusCode::OK, Json(data)),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "ok": false, "error": e })),
        ),
    }
}

/// GET /v1/account/{addr}/file/{hash} → stream file
async fn get_file(
    State(state): State<AppState>,
    Path((addr, hash)): Path<(String, String)>,
) -> axum::response::Response {
    use axum::body::Body;
    use axum::response::Response;

    if let Err((status, json)) = check_auth(&state.auth, &addr) {
        let body = serde_json::to_string(&json.0).unwrap();
        return Response::builder()
            .status(status)
            .body(Body::from(body))
            .unwrap();
    }

    let base_dir = match get_file_base_dir(&state.app_handle) {
        Ok(d) => d,
        Err(e) => {
            return Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from(serde_json::json!({ "error": e }).to_string()))
                .unwrap();
        }
    };

    let file_path = build_file_path(&base_dir, &hash);

    if !file_path.exists() {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::from(
                serde_json::json!({ "error": "file not found" }).to_string(),
            ))
            .unwrap();
    }

    match std::fs::read(&file_path) {
        Ok(data) => Response::builder()
            .status(StatusCode::OK)
            .header("content-type", "application/octet-stream")
            .body(Body::from(data))
            .unwrap(),
        Err(e) => Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .body(Body::from(
                serde_json::json!({ "error": e.to_string() }).to_string(),
            ))
            .unwrap(),
    }
}

/// POST /v1/account/{addr}/file/{hash}
async fn post_file(
    State(state): State<AppState>,
    Path((addr, hash)): Path<(String, String)>,
    body: axum::body::Bytes,
) -> impl IntoResponse {
    if let Err(e) = check_auth(&state.auth, &addr) {
        return e;
    }

    let base_dir = match get_file_base_dir(&state.app_handle) {
        Ok(d) => d,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            );
        }
    };

    let file_path = build_file_path(&base_dir, &hash);

    // Verify the file hash (QuarterSHA512: first 16 bytes of SHA-512, hex)
    use sha2::{Digest, Sha512};
    let mut hasher = Sha512::new();
    hasher.update(&body);
    let digest = hasher.finalize();
    let computed: String = digest
        .iter()
        .take(16)
        .map(|b| format!("{:02x}", b))
        .collect();
    if computed != hash.to_lowercase() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "ok": false,
                "error": "hash mismatch",
                "expected": hash,
                "computed": computed
            })),
        );
    }

    // Create parent directories
    if let Some(parent) = file_path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            );
        }
    }

    match std::fs::write(&file_path, &body) {
        Ok(()) => {
            // Insert into the files table so the Client can display it
            let db_path = get_db_path(&state.app_handle).unwrap_or_default();
            let _ = rusqlite::Connection::open(&db_path).and_then(|conn| {
                conn.execute(
                    "INSERT OR IGNORE INTO files (hash, size, updated_at, chunk_length, chunk_cursor, is_saved) VALUES (?1, ?2, ?3, 0, 0, 1)",
                    rusqlite::params![hash, body.len() as i64, std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)],
                )
            });
            (
                StatusCode::OK,
                Json(serde_json::json!({ "saved": true, "size": body.len() })),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

/* ── server entry point ────────────────────────────────────── */
pub async fn start_sync_server(app_handle: AppHandle, address: String) -> Result<(), String> {
    if SERVER_RUNNING.swap(true, Ordering::SeqCst) {
        return Err("Server already running".to_string());
    }

    // Start mDNS broadcast
    start_mdns_broadcast(&address)?;

    // Build axum router
    let state = AppState {
        app_handle,
        auth: Arc::new(std::sync::Mutex::new(AuthState::default())),
    };

    let app = Router::new()
        .route("/v1/device", get(get_device))
        .route("/v1/auth", post(post_auth))
        .route("/v1/account/:addr/state", get(get_state))
        .route(
            "/v1/account/:addr/private/:peer/messages",
            get(get_private_messages).post(post_private_messages),
        )
        .route(
            "/v1/account/:addr/group/:hash/messages",
            get(get_group_messages).post(post_group_messages),
        )
        .route(
            "/v1/account/:addr/groups",
            get(get_groups).post(post_groups),
        )
        .route(
            "/v1/account/:addr/metadata",
            get(get_metadata).post(post_metadata),
        )
        .route(
            "/v1/account/:addr/handshakes",
            get(get_handshakes).post(post_handshakes),
        )
        .route(
            "/v1/account/:addr/file/:hash",
            get(get_file).post(post_file),
        )
        .with_state(state);

    // Bind and serve
    let addr: SocketAddr = format!("0.0.0.0:{}", SYNC_PORT).parse().unwrap();
    log::info!("[SyncServer] Starting HTTP server on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| e.to_string())?;
    axum::serve(listener, app)
        .await
        .map_err(|e| format!("Server error: {}", e))?;

    SERVER_RUNNING.store(false, Ordering::SeqCst);
    Ok(())
}
