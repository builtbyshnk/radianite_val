mod app_state;
mod commands;
mod discord_rpc;
mod overlay;
mod riot;

use app_state::AppState;
use overlay::OverlayConfig;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_store::StoreExt;

const SETTINGS_STORE: &str = "settings.json";
const DEFAULT_MINIMIZE_TO_TRAY: bool = true;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState::new();
    let overlay_state = state.clone();

    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(move |app| {
            let seeded_config = load_overlay_config(app.handle());
            let state = overlay_state.clone();
            tauri::async_runtime::spawn(async move {
                state.set_overlay_config(seeded_config).await;
                state.start_overlay_server().await;
            });

            build_tray(app.handle())?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if minimize_to_tray_enabled(window.app_handle()) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::riot_start_monitor,
            commands::riot_stop_monitor,
            commands::riot_get_diagnostics,
            commands::riot_get_live_snapshot,
            commands::discord_rpc_set_enabled,
            commands::discord_rpc_get_status,
            commands::overlay_get_status,
            commands::overlay_get_config,
            commands::overlay_set_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn build_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show Radianite", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Radianite")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn minimize_to_tray_enabled(app: &tauri::AppHandle) -> bool {
    app.get_store(SETTINGS_STORE)
        .and_then(|store| store.get("minimizeToTray"))
        .and_then(|value| value.as_bool())
        .unwrap_or(DEFAULT_MINIMIZE_TO_TRAY)
}

fn load_overlay_config(app: &tauri::AppHandle) -> OverlayConfig {
    let mut config = OverlayConfig::default();
    if let Some(store) = app.get_store(SETTINGS_STORE) {
        if let Some(theme) = store
            .get("overlayTheme")
            .and_then(|value| value.as_str().map(str::to_owned))
        {
            config.theme = theme;
        }
        if let Some(show_player_id) = store
            .get("overlayShowPlayerId")
            .and_then(|value| value.as_bool())
        {
            config.show_player_id = show_player_id;
        }
    }
    config
}
