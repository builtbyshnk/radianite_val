use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use tauri::{utils::config::WindowConfig, AppHandle, LogicalSize, Manager, WebviewWindowBuilder};

fn bounded_window_size(config: &WindowConfig, size: LogicalSize<f64>) -> LogicalSize<f64> {
    LogicalSize::new(
        size.width.clamp(
            config.min_width.unwrap_or(config.width),
            config.max_width.unwrap_or(config.width),
        ),
        size.height.clamp(
            config.min_height.unwrap_or(config.height),
            config.max_height.unwrap_or(config.height),
        ),
    )
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
            let _ = window.unmaximize();
            if let (Ok(size), Ok(scale)) = (window.inner_size(), window.scale_factor()) {
                let size = size.to_logical::<f64>(scale);
                let bounded = bounded_window_size(&self.main_window, size);
                if size != bounded {
                    let _ = window.set_size(bounded);
                }
            }
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

    use super::{bounded_window_size, UiLifecycle};

    #[test]
    fn saved_window_sizes_stay_within_configured_bounds() {
        let config: tauri::utils::config::Config =
            serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        let window = &config.app.windows[0];
        assert!(!window.maximizable);
        for (width, height, expected_width, expected_height) in [
            (800.0, 600.0, 1024.0, 700.0),
            (1920.0, 1080.0, 1280.0, 900.0),
            (1152.0, 768.0, 1152.0, 768.0),
        ] {
            assert_eq!(
                bounded_window_size(window, tauri::LogicalSize::new(width, height)),
                tauri::LogicalSize::new(expected_width, expected_height),
            );
        }
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
