use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use tauri::{utils::config::WindowConfig, AppHandle, Manager, WebviewWindowBuilder};

pub const AUTOSTART_ARG: &str = "--autostart";

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

    use super::UiLifecycle;

    #[test]
    fn low_resource_mode_is_enabled_by_default_and_can_be_disabled() {
        let config: WindowConfig = serde_json::from_value(serde_json::json!({})).unwrap();
        let lifecycle = UiLifecycle::new(config);
        assert!(lifecycle.keeps_background_alive());

        lifecycle.apply_user_setting(false);

        assert!(!lifecycle.keeps_background_alive());
    }
}
