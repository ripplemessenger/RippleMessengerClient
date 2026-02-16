// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri_plugin_log::{
    log::LevelFilter, Builder as LogBuilder, RotationStrategy, Target, TargetKind,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
