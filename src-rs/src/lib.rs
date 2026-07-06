mod app_state;
mod commands;
mod discord_rpc;
mod lifecycle;
mod overlay;
mod riot;
mod settings;
mod shortcut;

// Missing community translation keys fall back to this English catalog.
rust_i18n::i18n!("locales", fallback = "en-US");

use app_state::AppState;
use lifecycle::{requests_gui, LaunchMode, UiLifecycle, AUTOSTART_ARG};
use rust_i18n::t;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, RunEvent, WindowEvent,
};
use tauri_plugin_store::StoreExt;

const DEFAULT_MINIMIZE_TO_TRAY: bool = true;

#[cfg(not(debug_assertions))]
fn prevent_default_shortcuts() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    use tauri_plugin_prevent_default::{Builder, PlatformOptions};

    Builder::new()
        .platform(
            PlatformOptions::new()
                .browser_accelerator_keys(false)
                .default_context_menus(false),
        )
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let launch_mode = LaunchMode::from_args(std::env::args());
    let mut context = tauri::generate_context!();
    let main_window = context
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == "main")
        .cloned()
        .expect("main window configuration is missing");
    if launch_mode.starts_without_window() {
        context.config_mut().app.windows.clear();
    }

    let state = AppState::new();
    let lifecycle = UiLifecycle::new(main_window, launch_mode);

    let builder = {
        let builder = tauri::Builder::default()
            .manage(state)
            .manage(lifecycle)
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_store::Builder::new().build())
            .plugin(
                tauri_plugin_autostart::Builder::new()
                    .arg(AUTOSTART_ARG)
                    .build(),
            )
            .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
                if requests_gui(&args) {
                    show_main_window(app);
                }
            }));

        #[cfg(not(debug_assertions))]
        {
            builder.plugin(prevent_default_shortcuts())
        }

        #[cfg(debug_assertions)]
        {
            builder
        }
    };

    let app = builder
        .setup(move |app| {
            let app_state = app.state::<AppState>();
            app_state.configure_public_cache(
                app.path().app_cache_dir()?,
                app.package_info().version.to_string(),
            );

            build_tray(app.handle())?;

            let state = app_state.inner().clone();
            let app_handle = app.handle().clone();
            let lifecycle = app.state::<UiLifecycle>().inner().clone();
            let low_resource_mode = settings::low_resource_mode_enabled(app.handle());
            lifecycle.set_low_resource_mode(low_resource_mode);
            tauri::async_runtime::spawn(async move {
                if launch_mode.starts_without_window() {
                    if let Ok(bootstrap) = settings::initialize(
                        &app_handle,
                        &state,
                        "en-US".to_string(),
                        "en-US".to_string(),
                    )
                    .await
                    {
                        lifecycle.set_low_resource_mode(bootstrap.settings.low_resource_mode);
                    }

                    if launch_mode == LaunchMode::Autostart && !lifecycle.keeps_background_alive() {
                        lifecycle.show_main_window(&app_handle);
                    }
                }

                state.start_overlay_server().await;
                state.start_monitor(app_handle).await;
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let lifecycle = window.app_handle().state::<UiLifecycle>();
                if !lifecycle.keeps_background_alive()
                    && minimize_to_tray_enabled(window.app_handle())
                {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_get_snapshot,
            commands::riot_start_monitor,
            commands::riot_stop_monitor,
            commands::riot_get_diagnostics,
            commands::riot_get_live_snapshot,
            commands::valorant_get_presentation,
            commands::discord_rpc_set_enabled,
            commands::discord_rpc_get_status,
            commands::discord_rpc_set_locale,
            commands::localization_set_ui_locale,
            commands::overlay_get_status,
            commands::settings_initialize,
            commands::settings_set,
        ])
        .build(context)
        .expect("error while building tauri application");

    app.run(|app: &tauri::AppHandle<tauri::Wry>, event| {
        if let RunEvent::ExitRequested {
            code: None, api, ..
        } = event
        {
            if app.state::<UiLifecycle>().keeps_background_alive() {
                api.prevent_exit();
            }
        }
    });
}

fn build_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let menu = localized_tray_menu(app)?;

    TrayIconBuilder::with_id("main")
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

fn localized_tray_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let show = MenuItem::with_id(app, "show", &t!("tray.show"), true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", &t!("tray.quit"), true, None::<&str>)?;
    Menu::with_items(app, &[&show, &quit])
}

pub(crate) fn refresh_tray_menu(app: &tauri::AppHandle) -> tauri::Result<()> {
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(localized_tray_menu(app)?))?;
    }
    Ok(())
}

fn show_main_window(app: &tauri::AppHandle) {
    app.state::<UiLifecycle>().show_main_window(app);
}

fn minimize_to_tray_enabled(app: &tauri::AppHandle) -> bool {
    app.get_store(settings::SETTINGS_STORE)
        .and_then(|store| store.get("minimizeToTray"))
        .and_then(|value| value.as_bool())
        .unwrap_or(DEFAULT_MINIMIZE_TO_TRAY)
}
