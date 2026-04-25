use tauri::WindowEvent;
use tauri_plugin_log::{
    log::LevelFilter, Builder as LogBuilder, RotationStrategy, Target, TargetKind,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Manager,
};

static IS_FLASHING: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn refresh_tray_menu(app: AppHandle) {
    let flashing = IS_FLASHING.load(Ordering::SeqCst);

    let show = MenuItem::with_id(&app, "show", "Show", true, None::<String>).unwrap();
    let quit = MenuItem::with_id(&app, "quit", "Quit", true, None::<String>).unwrap();

    let menu = if flashing {
        let stop =
            MenuItem::with_id(&app, "stop_flash", "Stop flash", true, None::<String>).unwrap();
        Menu::with_items(&app, &[&show, &stop, &quit]).unwrap()
    } else {
        Menu::with_items(&app, &[&show, &quit]).unwrap()
    };

    if let Some(tray) = app.tray_by_id("main_tray") {
        let _ = tray.set_menu(Some(menu));
    }
}

#[tauri::command]
async fn start_message_flash(app: AppHandle) {
    if IS_FLASHING.load(Ordering::SeqCst) {
        return;
    }

    IS_FLASHING.store(true, Ordering::SeqCst);
    refresh_tray_menu(app.clone());

    let tray = match app.tray_by_id("main_tray") {
        Some(t) => t,
        None => return,
    };

    let normal_icon = app
        .default_window_icon()
        .cloned()
        .unwrap_or_else(|| Image::from_bytes(include_bytes!("../icons/icon.png")).unwrap());

    let alert_icon = Image::from_bytes(include_bytes!("../icons/tray-alert.png"))
        .unwrap_or_else(|_| normal_icon.clone());

    let mut count = 0;
    while IS_FLASHING.load(Ordering::SeqCst) {
        let icon = if count % 2 == 0 {
            alert_icon.clone()
        } else {
            normal_icon.clone()
        };
        let _ = tray.set_icon(Some(icon));
        tokio::time::sleep(Duration::from_millis(600)).await;
        count += 1;
    }

    let _ = tray.set_icon(Some(normal_icon));
    IS_FLASHING.store(false, Ordering::SeqCst);
}

#[tauri::command]
fn stop_message_flash(app: AppHandle) {
    if !IS_FLASHING.load(Ordering::SeqCst) {
        return;
    }
    IS_FLASHING.store(false, Ordering::SeqCst);

    if let Some(tray) = app.tray_by_id("main_tray") {
        let normal_icon = app
            .default_window_icon()
            .cloned()
            .unwrap_or_else(|| Image::from_bytes(include_bytes!("../icons/icon.png")).unwrap());
        let _ = tray.set_icon(Some(normal_icon));
    }
    refresh_tray_menu(app);
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = stop_message_flash(app.clone());
    }
}

pub fn setup_tray(app: &App) -> tauri::Result<()> {
    let handle = app.handle();

    let show_item = MenuItem::with_id(handle, "show", "Show", true, None::<String>)?;
    let quit_item = MenuItem::with_id(handle, "quit", "Quit", true, None::<String>)?;

    let menu = Menu::with_items(handle, &[&show_item, &quit_item])?;

    let _tray = TrayIconBuilder::with_id("main_tray")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("RippleMessenger")
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button, .. } = event {
                if button == tauri::tray::MouseButton::Left {
                    show_main_window(tray.app_handle().clone())
                }
            }
        })
        .on_menu_event(move |app_handle, event| match event.id().as_ref() {
            "show" => show_main_window(app_handle.clone()),
            "stop_flash" => {
                stop_message_flash(app_handle.clone());
            }
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
            setup_tray(app).expect("Failed to setup tray");
            if let Some(window) = app.get_webview_window("main") {
                window.clone().on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                });
            }
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
            greet,
            start_message_flash,
            stop_message_flash
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
