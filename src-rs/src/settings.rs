use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_store::StoreExt;

use crate::discord_rpc::RpcPrivacy;
use crate::localization::{ensure_ui_locale, resolve_ui_locale, SYSTEM_LOCALE};
use crate::{app_state::AppState, riot::state::RpcStatus};

pub const SETTINGS_STORE: &str = "settings.json";
const LEGACY_BACKGROUND_SHORTCUT: &str = "Radianite Background.lnk";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub run_at_boot: bool,
    pub automatic_update_checks: bool,
    pub reduce_motion: bool,
    pub interface_scale: String,
    pub remember_window_state: bool,
    pub low_resource_mode: bool,
    pub enable_rpc_on_start: bool,
    #[serde(default)]
    pub rpc_hide_rank: bool,
    #[serde(default)]
    pub rpc_hide_party: bool,
    #[serde(default)]
    pub rpc_hide_elapsed: bool,
    pub overlay_theme: String,
    pub overlay_hide_details: bool,
    pub ui_locale: String,
    pub rpc_locale: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsBootstrap {
    pub settings: Settings,
    pub rpc_status: RpcStatus,
    pub resolved_ui_locale: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct StartupSettings {
    pub remember_window_state: bool,
    pub low_resource_mode: bool,
}

pub fn load_startup_settings(app: &AppHandle) -> Result<StartupSettings, String> {
    let store = app.store(SETTINGS_STORE).map_err(|err| err.to_string())?;
    Ok(startup_settings_from_values(
        store
            .get("rememberWindowState")
            .and_then(|value| value.as_bool()),
        store
            .get("lowResourceMode")
            .and_then(|value| value.as_bool()),
        store
            .get("minimizeToTray")
            .and_then(|value| value.as_bool()),
    ))
}

pub async fn initialize(
    app: &AppHandle,
    state: &AppState,
    default_rpc_locale: String,
) -> Result<SettingsBootstrap, String> {
    let _guard = state.lock_settings().await;
    remove_legacy_background_shortcut(app);
    let store = app.store(SETTINGS_STORE).map_err(|err| err.to_string())?;
    let stored_run_at_boot = store.get("runAtBoot").and_then(|value| value.as_bool());
    let run_at_boot = app
        .autolaunch()
        .is_enabled()
        .unwrap_or(stored_run_at_boot.unwrap_or(false));
    let settings = Settings {
        run_at_boot,
        automatic_update_checks: store
            .get("automaticUpdateChecks")
            .and_then(|value| value.as_bool())
            .unwrap_or(false),
        reduce_motion: store
            .get("reduceMotion")
            .and_then(|value| value.as_bool())
            .unwrap_or(false),
        interface_scale: valid_interface_scale(store.get("interfaceScale").and_then(json_string)),
        remember_window_state: store
            .get("rememberWindowState")
            .and_then(|value| value.as_bool())
            .unwrap_or(false),
        low_resource_mode: match (
            store
                .get("lowResourceMode")
                .and_then(|value| value.as_bool()),
            store
                .get("minimizeToTray")
                .and_then(|value| value.as_bool()),
        ) {
            (Some(low_resource), Some(minimize_to_tray)) => low_resource || minimize_to_tray,
            (Some(value), None) | (None, Some(value)) => value,
            (None, None) => true,
        },
        enable_rpc_on_start: store
            .get("enableRpcOnStart")
            .and_then(|value| value.as_bool())
            .unwrap_or(true),
        overlay_theme: valid_overlay_theme(store.get("overlayTheme").and_then(json_string)),
        rpc_hide_rank: store
            .get("rpcHideRank")
            .and_then(|value| value.as_bool())
            .unwrap_or(false),
        rpc_hide_party: store
            .get("rpcHideParty")
            .and_then(|value| value.as_bool())
            .unwrap_or(false),
        rpc_hide_elapsed: store
            .get("rpcHideElapsed")
            .and_then(|value| value.as_bool())
            .unwrap_or(false),
        overlay_hide_details: store
            .get("overlayHideDetails")
            .and_then(|value| value.as_bool())
            .unwrap_or(false),
        ui_locale: store
            .get("uiLocale")
            .and_then(json_string)
            .filter(|locale| ensure_ui_locale(locale).is_ok())
            .unwrap_or_else(|| SYSTEM_LOCALE.to_string()),
        rpc_locale: valid_locale(
            store.get("rpcLocale").and_then(json_string),
            &default_rpc_locale,
        ),
    };

    apply_autostart(app, settings.run_at_boot)?;
    let resolved_ui_locale = resolve_ui_locale(&settings.ui_locale);
    apply_ui_locale(app, &resolved_ui_locale)?;
    state.set_rpc_privacy(settings.rpc_privacy()).await;
    state.set_rpc_locale(settings.rpc_locale.clone()).await;
    state
        .set_overlay_theme(settings.overlay_theme.clone())
        .await;
    state
        .set_overlay_hide_details(settings.overlay_hide_details)
        .await;
    let rpc_status = state.set_rpc_enabled(settings.enable_rpc_on_start).await;
    save(app, &settings)?;

    Ok(SettingsBootstrap {
        settings,
        rpc_status,
        resolved_ui_locale,
    })
}

pub async fn update(
    app: &AppHandle,
    state: &AppState,
    settings: Settings,
) -> Result<SettingsBootstrap, String> {
    let _guard = state.lock_settings().await;
    ensure_ui_locale(&settings.ui_locale)?;
    ensure_locale(&settings.rpc_locale)?;
    ensure_overlay_theme(&settings.overlay_theme)?;
    ensure_interface_scale(&settings.interface_scale)?;

    let store = app.store(SETTINGS_STORE).map_err(|err| err.to_string())?;
    let previous_ui_locale = store.get("uiLocale").and_then(json_string);
    let previous_rpc_locale = store.get("rpcLocale").and_then(json_string);
    let resolved_ui_locale = resolve_ui_locale(&settings.ui_locale);
    let result = async {
        apply_autostart(app, settings.run_at_boot)?;
        if previous_ui_locale.as_deref() != Some(settings.ui_locale.as_str())
            || settings.ui_locale == SYSTEM_LOCALE
        {
            apply_ui_locale(app, &resolved_ui_locale)?;
        }
        if previous_rpc_locale.as_deref() != Some(settings.rpc_locale.as_str()) {
            state.set_rpc_locale(settings.rpc_locale.clone()).await;
        }
        state
            .set_overlay_theme(settings.overlay_theme.clone())
            .await;
        state
            .set_overlay_hide_details(settings.overlay_hide_details)
            .await;
        save(app, &settings)?;
        Ok::<_, String>(state.set_rpc_privacy(settings.rpc_privacy()).await)
    }
    .await;

    let rpc_status = match result {
        Ok(status) => status,
        Err(err) => return Err(err),
    };

    Ok(SettingsBootstrap {
        settings,
        rpc_status,
        resolved_ui_locale,
    })
}

fn startup_settings_from_values(
    remember_window_state: Option<bool>,
    low_resource_mode: Option<bool>,
    minimize_to_tray: Option<bool>,
) -> StartupSettings {
    let low_resource_mode = match (low_resource_mode, minimize_to_tray) {
        (Some(low_resource), Some(minimize_to_tray)) => low_resource || minimize_to_tray,
        (Some(value), None) | (None, Some(value)) => value,
        (None, None) => true,
    };
    StartupSettings {
        remember_window_state: remember_window_state.unwrap_or(false),
        low_resource_mode,
    }
}

impl Settings {
    fn rpc_privacy(&self) -> RpcPrivacy {
        RpcPrivacy {
            hide_rank: self.rpc_hide_rank,
            hide_party: self.rpc_hide_party,
            hide_elapsed: self.rpc_hide_elapsed,
        }
    }
}

fn apply_autostart(app: &AppHandle, enabled: bool) -> Result<(), String> {
    if std::env::var_os("RADIANITE_RESOURCE_BENCHMARK").is_some() {
        return Ok(());
    }
    let autolaunch = app.autolaunch();
    let autolaunch_enabled = autolaunch.is_enabled().map_err(|err| err.to_string())?;
    if enabled {
        // Re-register so existing installs drop obsolete launch arguments and
        // refresh the executable path after updates.
        autolaunch.enable().map_err(|err| err.to_string())?;
    } else if !enabled && autolaunch_enabled {
        autolaunch.disable().map_err(|err| err.to_string())?;
    }
    Ok(())
}

fn remove_legacy_background_shortcut(app: &AppHandle) {
    let Ok(desktop_dir) = app.path().desktop_dir() else {
        return;
    };
    let shortcut = desktop_dir.join(LEGACY_BACKGROUND_SHORTCUT);
    if let Err(err) = std::fs::remove_file(shortcut) {
        if err.kind() != std::io::ErrorKind::NotFound {
            eprintln!("failed to remove legacy background shortcut: {err}");
        }
    }
}

fn apply_ui_locale(app: &AppHandle, locale: &str) -> Result<(), String> {
    rust_i18n::set_locale(locale);
    crate::refresh_tray_menu(app).map_err(|err| err.to_string())?;
    Ok(())
}

fn save(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let store = app.store(SETTINGS_STORE).map_err(|err| err.to_string())?;
    store.set("runAtBoot", settings.run_at_boot);
    store.delete("startMinimized");
    store.set("automaticUpdateChecks", settings.automatic_update_checks);
    store.set("reduceMotion", settings.reduce_motion);
    store.set("interfaceScale", settings.interface_scale.clone());
    store.set("rememberWindowState", settings.remember_window_state);
    store.delete("minimizeToTray");
    store.set("lowResourceMode", settings.low_resource_mode);
    store.set("enableRpcOnStart", settings.enable_rpc_on_start);
    store.set("rpcHideRank", settings.rpc_hide_rank);
    store.set("rpcHideParty", settings.rpc_hide_party);
    store.set("rpcHideElapsed", settings.rpc_hide_elapsed);
    store.set("overlayTheme", settings.overlay_theme.clone());
    store.set("overlayHideDetails", settings.overlay_hide_details);
    store.set("uiLocale", settings.ui_locale.clone());
    store.set("rpcLocale", settings.rpc_locale.clone());
    store.save().map_err(|err| err.to_string())?;
    Ok(())
}

fn json_string(value: serde_json::Value) -> Option<String> {
    value.as_str().map(ToOwned::to_owned)
}

fn valid_locale(stored: Option<String>, fallback: &str) -> String {
    stored
        .filter(|locale| ensure_locale(locale).is_ok())
        .unwrap_or_else(|| fallback.to_string())
}

fn valid_overlay_theme(stored: Option<String>) -> String {
    stored
        .filter(|theme| ensure_overlay_theme(theme).is_ok())
        .unwrap_or_else(|| "nightfall".to_string())
}

fn valid_interface_scale(stored: Option<String>) -> String {
    stored
        .filter(|scale| ensure_interface_scale(scale).is_ok())
        .unwrap_or_else(|| "default".to_string())
}

fn ensure_interface_scale(scale: &str) -> Result<(), String> {
    match scale {
        "compact" | "default" | "comfortable" => Ok(()),
        _ => Err(format!("unsupported interface scale: {scale}")),
    }
}

fn ensure_overlay_theme(theme: &str) -> Result<(), String> {
    match theme {
        "nightfall" | "catppuccin" | "evergreen" | "solarized" | "porcelain" | "rose" => Ok(()),
        _ => Err(format!("unsupported overlay theme: {theme}")),
    }
}

fn ensure_locale(locale: &str) -> Result<(), String> {
    if rust_i18n::available_locales!()
        .iter()
        .any(|available| *available == locale)
    {
        Ok(())
    } else {
        Err(format!("unsupported locale: {locale}"))
    }
}

#[cfg(test)]
mod tests {
    use super::{startup_settings_from_values, StartupSettings};

    #[test]
    fn existing_settings_default_to_current_discord_visibility() {
        let mut stored = serde_json::json!({
            "runAtBoot": false, "automaticUpdateChecks": false, "reduceMotion": false,
            "interfaceScale": "default", "rememberWindowState": false,
            "lowResourceMode": true, "enableRpcOnStart": true,
            "overlayTheme": "nightfall", "overlayHideDetails": false,
            "uiLocale": "system", "rpcLocale": "en-US"
        });
        let settings: super::Settings = serde_json::from_value(stored.clone()).unwrap();
        assert_eq!(
            settings.rpc_privacy(),
            crate::discord_rpc::RpcPrivacy::default()
        );
        stored["rpcHideRank"] = true.into();
        stored["rpcHideParty"] = true.into();
        stored["rpcHideElapsed"] = true.into();
        let settings: super::Settings = serde_json::from_value(stored).unwrap();
        let round_trip: super::Settings =
            serde_json::from_value(serde_json::to_value(&settings).unwrap()).unwrap();
        assert_eq!(settings, round_trip);
        assert!(round_trip.rpc_privacy().hide_rank);
        assert!(round_trip.rpc_privacy().hide_party);
        assert!(round_trip.rpc_privacy().hide_elapsed);
    }

    #[test]
    fn startup_settings_use_safe_defaults_when_missing() {
        assert_eq!(
            startup_settings_from_values(None, None, None),
            StartupSettings {
                remember_window_state: false,
                low_resource_mode: true,
            }
        );
    }

    #[test]
    fn startup_settings_use_persisted_values() {
        assert_eq!(
            startup_settings_from_values(Some(true), Some(false), None),
            StartupSettings {
                remember_window_state: true,
                low_resource_mode: false,
            }
        );
    }

    #[test]
    fn startup_settings_merge_legacy_tray_preference() {
        assert!(
            startup_settings_from_values(Some(false), Some(false), Some(true)).low_resource_mode
        );
    }
}
