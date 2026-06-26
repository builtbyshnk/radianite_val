mod app_state;
mod commands;
mod discord_rpc;
mod riot;

use app_state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::new())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::riot_start_monitor,
            commands::riot_stop_monitor,
            commands::riot_get_diagnostics,
            commands::riot_get_live_snapshot,
            commands::discord_rpc_set_enabled,
            commands::discord_rpc_get_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
