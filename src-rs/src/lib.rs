mod app_state;
mod commands;
mod discord_rpc;
mod lifecycle;
mod overlay;
mod riot;
mod settings;

// Missing community translation keys fall back to this English catalog.
rust_i18n::i18n!("locales", fallback = "en-US");

use app_state::AppState;
use lifecycle::{UiLifecycle, AUTOSTART_ARG};
use rust_i18n::t;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, RunEvent,
};
use tauri_plugin_window_state::{StateFlags, WindowExt};

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
    let mut context = tauri::generate_context!();
    let main_window = context
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == "main")
        .cloned()
        .expect("main window configuration is missing");
    context
        .config_mut()
        .app
        .windows
        .iter_mut()
        .find(|window| window.label == "main")
        .expect("main window configuration is missing")
        .visible = false;
    let autostart_launch = std::env::args().any(|arg| arg == AUTOSTART_ARG);
    let state = AppState::new();
    let lifecycle = UiLifecycle::new(main_window);

    let builder = {
        let builder = tauri::Builder::default()
            .manage(state)
            .manage(lifecycle)
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_store::Builder::new().build())
            .plugin(
                tauri_plugin_window_state::Builder::new()
                    .with_state_flags(
                        StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED,
                    )
                    .skip_initial_state("main")
                    .build(),
            )
            .plugin(
                tauri_plugin_autostart::Builder::new()
                    .arg(AUTOSTART_ARG)
                    .build(),
            )
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                show_main_window(app);
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
            if settings::remember_window_state_enabled(app.handle()) {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.restore_state(
                        StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED,
                    );
                }
            }
            if !autostart_launch || !settings::start_minimized_enabled(app.handle()) {
                lifecycle.show_main_window(app.handle());
            }
            tauri::async_runtime::spawn(async move {
                state.start_overlay_server().await;
                state.start_monitor(app_handle).await;
            });

            Ok(())
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
