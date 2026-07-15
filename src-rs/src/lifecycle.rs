use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use tauri::{utils::config::WindowConfig, AppHandle, Manager, WebviewWindowBuilder};

pub const AUTOSTART_ARG: &str = "--autostart";

pub fn is_autostart_launch<I, S>(args: I) -> bool
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter().any(|arg| arg.as_ref() == AUTOSTART_ARG)
}

pub fn should_show_main_window(autostart_launch: bool, start_minimized: bool) -> bool {
    !autostart_launch || !start_minimized
}

#[derive(Clone)]
pub struct UiLifecycle {
    main_window: Arc<WindowConfig>,
    low_resource_mode: Arc<AtomicBool>,
}

impl UiLifecycle {
    pub fn new(main_window: WindowConfig) -> Self {
        Self {
            main_window: Arc::new(main_window),
            low_resource_mode: Arc::new(AtomicBool::new(true)),
        }
    }

    pub fn set_low_resource_mode(&self, enabled: bool) {
        self.low_resource_mode.store(enabled, Ordering::Relaxed);
    }

    pub fn apply_user_setting(&self, enabled: bool) {
        self.set_low_resource_mode(enabled);
    }

    pub fn keeps_background_alive(&self) -> bool {
        self.low_resource_mode.load(Ordering::Relaxed)
    }

    pub fn show_main_window(&self, app: &AppHandle) {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
            return;
        }

        let app = app.clone();
        let config = self.main_window.clone();
        let _ = app.clone().run_on_main_thread(move || {
            if app.get_webview_window("main").is_none() {
                let _ = WebviewWindowBuilder::from_config(&app, &config).and_then(|builder| {
                    builder.build()?;
                    Ok(())
                });
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use tauri::utils::config::WindowConfig;

    use super::{is_autostart_launch, should_show_main_window, UiLifecycle};

    #[test]
    fn manual_launch_always_shows_the_window() {
        assert!(should_show_main_window(false, false));
        assert!(should_show_main_window(false, true));
    }

    #[test]
    fn autostart_launch_only_stays_hidden_when_requested() {
        assert!(should_show_main_window(true, false));
        assert!(!should_show_main_window(true, true));
    }

    #[test]
    fn identifies_primary_and_secondary_autostart_arguments() {
        assert!(is_autostart_launch(["radianite.exe", "--autostart"]));
        assert!(!is_autostart_launch(["radianite.exe"]));
    }

    #[test]
    fn low_resource_mode_is_enabled_by_default_and_can_be_disabled() {
        let config: WindowConfig = serde_json::from_value(serde_json::json!({})).unwrap();
        let lifecycle = UiLifecycle::new(config);
        assert!(lifecycle.keeps_background_alive());

        lifecycle.apply_user_setting(false);

        assert!(!lifecycle.keeps_background_alive());
    }
}
