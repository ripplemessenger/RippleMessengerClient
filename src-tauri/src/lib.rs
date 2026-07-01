use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton};
use tauri::{App, AppHandle, Manager, WindowEvent};
use tauri_plugin_log::{
    log::{self, LevelFilter},
    Builder as LogBuilder,
    RotationStrategy, Target, TargetKind,
};

/* ── constants ─────────────────────────────────────────────── */
const FLASH_INTERVAL_MS: u64 = 600;
const TRAY_ID: &str = "main_tray";
const MAIN_WINDOW_LABEL: &str = "main";

/* ── shared state ──────────────────────────────────────────── */
static IS_FLASHING: AtomicBool = AtomicBool::new(false);
static FLASH_TASK: Mutex<Option<tokio::task::AbortHandle>> = Mutex::new(None);

/* ── helpers (non-command, reusable by tray callbacks) ─────── */
fn get_normal_icon(app: &AppHandle) -> Option<Image<'_>> {
    app.default_window_icon()
        .cloned()
        .or_else(|| Image::from_bytes(include_bytes!("../icons/icon.png")).ok())
}

fn refresh_tray_menu_internal(app: &AppHandle) {
    let flashing = IS_FLASHING.load(Ordering::SeqCst);

    let show = match MenuItem::with_id(app, "show", "Show", true, None::<String>) {
        Ok(item) => item,
        Err(e) => {
            log::warn!("Failed to create 'show' menu item: {}", e);
            return;
        }
    };
    let quit = match MenuItem::with_id(app, "quit", "Quit", true, None::<String>) {
        Ok(item) => item,
        Err(e) => {
            log::warn!("Failed to create 'quit' menu item: {}", e);
            return;
        }
    };

    let menu = if flashing {
        let stop = match MenuItem::with_id(app, "stop_flash", "Stop flash", true, None::<String>) {
            Ok(item) => item,
            Err(e) => {
                log::warn!("Failed to create 'stop_flash' menu item: {}", e);
                return;
            }
        };
        match Menu::with_items(app, &[&show, &stop, &quit]) {
            Ok(m) => m,
            Err(e) => {
                log::warn!("Failed to build tray menu: {}", e);
                return;
            }
        }
    } else {
        match Menu::with_items(app, &[&show, &quit]) {
            Ok(m) => m,
            Err(e) => {
                log::warn!("Failed to build tray menu: {}", e);
                return;
            }
        }
    };

    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        if let Err(e) = tray.set_menu(Some(menu)) {
            log::warn!("Failed to set tray menu: {}", e);
        }
    }
}

async fn start_message_flash_internal(app: &AppHandle) {
    // Abort any existing flash task before starting a new one
    {
        let mut task = match FLASH_TASK.lock() {
            Ok(t) => t,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(handle) = task.take() {
            handle.abort();
        }
    }

    if IS_FLASHING.load(Ordering::SeqCst) {
        IS_FLASHING.store(false, Ordering::SeqCst);
    }

    IS_FLASHING.store(true, Ordering::SeqCst);
    refresh_tray_menu_internal(app);

    let tray = match app.tray_by_id(TRAY_ID) {
        Some(t) => t,
        None => {
            log::warn!("Tray '{}' not found, cannot start flash", TRAY_ID);
            IS_FLASHING.store(false, Ordering::SeqCst);
            return;
        }
    };

    // Use include_bytes! directly — 'static byte slices, no lifetime issues
    let normal_icon_bytes: &'static [u8] = include_bytes!("../icons/icon.png");
    let alert_icon_bytes: &'static [u8] = include_bytes!("../icons/tray-alert.png");

    let tray_clone = tray.clone();
    let handle = tokio::spawn(async move {
        let mut count: u32 = 0;
        while IS_FLASHING.load(Ordering::SeqCst) {
            let icon_bytes = if count % 2 == 0 { alert_icon_bytes } else { normal_icon_bytes };
            let icon = Image::from_bytes(icon_bytes).ok();
            if let Some(ic) = icon {
                if let Err(e) = tray_clone.set_icon(Some(ic)) {
                    log::warn!("Failed to set tray icon during flash: {}", e);
                }
            }
            tokio::time::sleep(Duration::from_millis(FLASH_INTERVAL_MS)).await;
            count += 1;
        }
        // Restore normal icon when flash stops
        if let Ok(ic) = Image::from_bytes(normal_icon_bytes) {
            if let Err(e) = tray_clone.set_icon(Some(ic)) {
                log::warn!("Failed to restore tray icon: {}", e);
            }
        }
    });

    let mut task = match FLASH_TASK.lock() {
        Ok(t) => t,
        Err(poisoned) => poisoned.into_inner(),
    };
    *task = Some(handle.abort_handle());
}

#[tauri::command]
async fn start_message_flash(app: AppHandle) {
    start_message_flash_internal(&app).await;
}

fn stop_message_flash_internal(app: &AppHandle) {
    if !IS_FLASHING.load(Ordering::SeqCst) {
        return;
    }
    IS_FLASHING.store(false, Ordering::SeqCst);

    // Abort the flash task if running
    let mut task = match FLASH_TASK.lock() {
        Ok(t) => t,
        Err(poisoned) => poisoned.into_inner(),
    };
    if let Some(handle) = task.take() {
        handle.abort();
    }

    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        if let Some(icon) = get_normal_icon(app) {
            if let Err(e) = tray.set_icon(Some(icon)) {
                log::warn!("Failed to restore tray icon on stop: {}", e);
            }
        }
    }
    refresh_tray_menu_internal(app);
}

#[tauri::command]
fn stop_message_flash(app: AppHandle) {
    stop_message_flash_internal(&app);
}

fn show_main_window_internal(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        if let Err(e) = window.show() {
            log::warn!("Failed to show window: {}", e);
        }
        if let Err(e) = window.set_focus() {
            log::warn!("Failed to focus window: {}", e);
        }
        stop_message_flash_internal(app);
    }
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    show_main_window_internal(&app);
}

pub fn setup_tray(app: &App) -> tauri::Result<()> {
    let handle = app.handle();

    let show_item = MenuItem::with_id(handle, "show", "Show", true, None::<String>)?;
    let quit_item = MenuItem::with_id(handle, "quit", "Quit", true, None::<String>)?;

    let menu = Menu::with_items(handle, &[&show_item, &quit_item])?;

    let tray_icon = app.default_window_icon().cloned()
        .or_else(|| Image::from_bytes(include_bytes!("../icons/icon.png")).ok())
        .expect("No default window icon and failed to load fallback icon for tray");

    let _tray = TrayIconBuilder::with_id(TRAY_ID)
        .icon(tray_icon)
        .menu(&menu)
        .tooltip("RippleMessenger")
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button, .. } = event {
                if button == MouseButton::Left {
                    show_main_window_internal(tray.app_handle());
                }
            }
        })
        .on_menu_event(|app_handle, event| match event.id().as_ref() {
            "show" => show_main_window_internal(app_handle),
            "stop_flash" => stop_message_flash_internal(app_handle),
            "quit" => app_handle.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            setup_tray(app).map_err(|e| format!("Failed to setup tray: {}", e))?;

            if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                window.clone().on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Err(e) = window.hide() {
                            log::warn!("Failed to hide window on close: {}", e);
                        }
                    }
                });
            }
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_single_instance::init(
                    |app_handle, _args, _cwd| {
                        if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    },
                ))?;
            Ok(())
        })
        .plugin(
            LogBuilder::new()
                .level_for("sqlx", LevelFilter::Warn)
                .level_for("sqlx::query", LevelFilter::Off)
                .level_for("sqlx::sqlite", LevelFilter::Off)
                .targets([Target::new(TargetKind::LogDir { file_name: None })])
                .rotation_strategy(RotationStrategy::KeepAll)
                .build(),
        )
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_message_flash,
            stop_message_flash
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
