use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use tauri::{utils::config::WindowConfig, AppHandle, Manager, WebviewWindowBuilder};

pub const BACKGROUND_ARG: &str = "--background";
pub const AUTOSTART_ARG: &str = "--autostart";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LaunchMode {
    Gui,
    Background,
    Autostart,
}

impl LaunchMode {
    pub fn from_args(args: impl IntoIterator<Item = String>) -> Self {
        let mut mode = Self::Gui;
        for arg in args {
            match arg.as_str() {
                BACKGROUND_ARG => return Self::Background,
                AUTOSTART_ARG => mode = Self::Autostart,
                _ => {}
            }
        }
        mode
    }

    pub fn starts_without_window(self) -> bool {
        self != Self::Gui
    }
}

#[derive(Clone)]
pub struct UiLifecycle {
    main_window: Arc<WindowConfig>,
    force_background: Arc<AtomicBool>,
    low_resource_mode: Arc<AtomicBool>,
}

impl UiLifecycle {
    pub fn new(main_window: WindowConfig, launch_mode: LaunchMode) -> Self {
        Self {
            main_window: Arc::new(main_window),
            force_background: Arc::new(AtomicBool::new(launch_mode == LaunchMode::Background)),
            low_resource_mode: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn set_low_resource_mode(&self, enabled: bool) {
        self.low_resource_mode.store(enabled, Ordering::Relaxed);
    }

    pub fn apply_user_setting(&self, enabled: bool) {
        self.set_low_resource_mode(enabled);
        if !enabled {
            self.force_background.store(false, Ordering::Relaxed);
        }
    }

    pub fn keeps_background_alive(&self) -> bool {
        self.force_background.load(Ordering::Relaxed)
            || self.low_resource_mode.load(Ordering::Relaxed)
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

pub fn requests_gui(args: &[String]) -> bool {
    !args
        .iter()
        .any(|arg| arg == BACKGROUND_ARG || arg == AUTOSTART_ARG)
}

#[cfg(test)]
mod tests {
    use tauri::utils::config::WindowConfig;

    use super::{requests_gui, LaunchMode, UiLifecycle};

    #[test]
    fn parses_launch_modes_with_background_precedence() {
        assert_eq!(
            LaunchMode::from_args(["radianite.exe".into()]),
            LaunchMode::Gui
        );
        assert_eq!(
            LaunchMode::from_args(["radianite.exe".into(), "--autostart".into()]),
            LaunchMode::Autostart
        );
        assert_eq!(
            LaunchMode::from_args([
                "radianite.exe".into(),
                "--autostart".into(),
                "--background".into(),
            ]),
            LaunchMode::Background
        );
    }

    #[test]
    fn only_normal_second_launch_requests_the_gui() {
        assert!(requests_gui(&["radianite.exe".into()]));
        assert!(!requests_gui(&[
            "radianite.exe".into(),
            "--background".into()
        ]));
    }

    #[test]
    fn disabling_the_setting_clears_an_explicit_background_override() {
        let config: WindowConfig = serde_json::from_value(serde_json::json!({})).unwrap();
        let lifecycle = UiLifecycle::new(config, LaunchMode::Background);
        assert!(lifecycle.keeps_background_alive());

        lifecycle.apply_user_setting(false);

        assert!(!lifecycle.keeps_background_alive());
    }
}
