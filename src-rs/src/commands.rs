use tauri::{AppHandle, Emitter, Manager, State};

#[derive(serde::Deserialize, serde::Serialize)]
pub struct ReleaseNotes {
    body: Option<String>,
    #[serde(rename(deserialize = "published_at"))]
    date: Option<String>,
    #[serde(rename(deserialize = "html_url"))]
    url: String,
}

#[tauri::command]
pub async fn release_get_notes(version: String) -> Result<ReleaseNotes, String> {
    let tag = format!("v{}", version.trim_start_matches(['v', 'V']));
    let mut url = reqwest::Url::parse(
        "https://api.github.com/repos/builtbyshnk/radianite_val/releases/tags/",
    )
    .map_err(|err| err.to_string())?;
    url.path_segments_mut()
        .map_err(|_| "invalid release URL")?
        .pop_if_empty()
        .push(&tag);
    reqwest::Client::builder()
        .user_agent("radianite")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|err| err.to_string())?
        .get(url)
        .header(reqwest::header::ACCEPT, "application/vnd.github+json")
        .send()
        .await
        .and_then(reqwest::Response::error_for_status)
        .map_err(|err| err.to_string())?
        .json::<ReleaseNotes>()
        .await
        .map_err(|err| err.to_string())
}

use crate::{
    app_state::AppState,
    lifecycle::UiLifecycle,
    riot::{
        state::{
            AppSnapshot, CoreStatus, DiagnosticSnapshot, LiveSnapshot, OverlayStatus, RpcStatus,
        },
        valorant_client::ValorantPresentation,
    },
    settings::{self, Settings, SettingsBootstrap},
};

#[tauri::command]
pub fn dev_mode_get_enabled(state: State<'_, AppState>) -> Option<bool> {
    state.dev_mode()
}

#[tauri::command]
pub async fn dev_mode_set_enabled(
    app: AppHandle,
    state: State<'_, AppState>,
    enabled: bool,
) -> Result<(), String> {
    state.set_dev_mode(app, enabled).await
}

#[tauri::command]
pub async fn app_get_snapshot(state: State<'_, AppState>) -> Result<AppSnapshot, String> {
    Ok(state.app_snapshot().await)
}

#[tauri::command]
pub async fn app_support_report(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let snapshot = state.app_snapshot().await;
    serde_json::to_string_pretty(&support_report(
        &snapshot,
        &app.package_info().version.to_string(),
    ))
    .map_err(|err| err.to_string())
}

fn support_report(snapshot: &AppSnapshot, version: &str) -> serde_json::Value {
    let diagnostics = &snapshot.diagnostics;
    // Allowlist fields: raw diagnostics contain account names, paths, and errors.
    serde_json::json!({
        "appVersion": version,
        "os": std::env::consts::OS,
        "architecture": std::env::consts::ARCH,
        "generatedAt": crate::riot::state::now_timestamp(),
        "status": diagnostics.status.kind,
        "monitoring": diagnostics.status.monitored,
        "riotInstalled": diagnostics.riot_installs_json_exists,
        "lockfileFound": diagnostics.lockfile_exists,
        "localApiReady": diagnostics.local_api_ready,
        "valorantSessionPresent": diagnostics.valorant_session_present,
        "accessTokenReady": diagnostics.access_token_ready,
        "entitlementTokenReady": diagnostics.entitlement_token_ready,
        "discord": {
            "enabled": snapshot.rpc_status.enabled,
            "connected": snapshot.rpc_status.connected,
            "configured": snapshot.rpc_status.configured,
        },
        "overlayRunning": snapshot.overlay_status.enabled,
        "updatedAt": diagnostics.updated_at,
    })
}

#[tauri::command]
pub async fn riot_start_monitor(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CoreStatus, String> {
    let status = state.start_monitor(app.clone()).await;
    app.emit("riot:status", status.clone())
        .map_err(|err| err.to_string())?;
    Ok(status)
}

#[tauri::command]
pub async fn riot_stop_monitor(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CoreStatus, String> {
    let status = state.stop_monitor().await;
    app.emit("riot:status", status.clone())
        .map_err(|err| err.to_string())?;
    Ok(status)
}

#[tauri::command]
pub async fn riot_get_diagnostics(
    state: State<'_, AppState>,
) -> Result<DiagnosticSnapshot, String> {
    Ok(state.diagnostics().await)
}

#[tauri::command]
pub async fn riot_get_live_snapshot(
    state: State<'_, AppState>,
) -> Result<Option<LiveSnapshot>, String> {
    Ok(state.live_snapshot().await)
}

#[tauri::command]
pub async fn valorant_get_presentation(
    state: State<'_, AppState>,
    locale: String,
    agent_id: Option<String>,
    map_id: Option<String>,
    tier: Option<u32>,
) -> Result<ValorantPresentation, String> {
    if !rust_i18n::available_locales!()
        .iter()
        .any(|available| *available == locale)
    {
        return Err(format!("unsupported UI locale: {locale}"));
    }
    state
        .valorant_presentation(&locale, agent_id.as_deref(), map_id.as_deref(), tier)
        .await
}

#[tauri::command]
pub async fn discord_rpc_set_enabled(
    app: AppHandle,
    state: State<'_, AppState>,
    enabled: bool,
) -> Result<RpcStatus, String> {
    let status = state.set_rpc_enabled(enabled).await;
    app.emit("discord:status", status.clone())
        .map_err(|err| err.to_string())?;
    Ok(status)
}

#[tauri::command]
pub async fn discord_rpc_get_status(state: State<'_, AppState>) -> Result<RpcStatus, String> {
    Ok(state.rpc_status().await)
}

#[tauri::command]
pub async fn discord_rpc_set_locale(
    app: AppHandle,
    state: State<'_, AppState>,
    locale: String,
) -> Result<RpcStatus, String> {
    if !rust_i18n::available_locales!()
        .iter()
        .any(|available| *available == locale)
    {
        return Err(format!("unsupported RPC locale: {locale}"));
    }
    let status = state.set_rpc_locale(locale).await;
    app.emit("discord:status", status.clone())
        .map_err(|err| err.to_string())?;
    Ok(status)
}

#[tauri::command]
pub fn localization_set_ui_locale(app: AppHandle, locale: String) -> Result<(), String> {
    if !rust_i18n::available_locales!()
        .iter()
        .any(|available| *available == locale)
    {
        return Err(format!("unsupported UI locale: {locale}"));
    }
    rust_i18n::set_locale(&locale);
    crate::refresh_tray_menu(&app).map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn overlay_get_status(state: State<'_, AppState>) -> Result<OverlayStatus, String> {
    Ok(state.overlay_status().await)
}

#[tauri::command]
pub async fn settings_initialize(
    app: AppHandle,
    state: State<'_, AppState>,
    default_rpc_locale: String,
) -> Result<SettingsBootstrap, String> {
    let bootstrap = settings::initialize(&app, &state, default_rpc_locale).await?;
    app.state::<UiLifecycle>()
        .set_low_resource_mode(bootstrap.settings.low_resource_mode);
    Ok(bootstrap)
}

#[tauri::command]
pub async fn settings_set(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: Settings,
) -> Result<SettingsBootstrap, String> {
    let bootstrap = settings::update(&app, &state, settings).await?;
    app.state::<UiLifecycle>()
        .apply_user_setting(bootstrap.settings.low_resource_mode);
    Ok(bootstrap)
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn support_report_excludes_identity_paths_and_raw_errors() {
        let mut snapshot = crate::app_state::AppState::new().app_snapshot().await;
        snapshot.diagnostics.game_name = Some("private-player".to_string());
        snapshot.diagnostics.game_tag = Some("private-tag".to_string());
        snapshot.diagnostics.lockfile_path = Some("private-lockfile-path".to_string());
        snapshot.diagnostics.riot_installs_path = Some("private-install-path".to_string());
        snapshot.diagnostics.last_error = Some("private-raw-error".to_string());
        snapshot.diagnostics.status.message.detail = Some("private-error-detail".to_string());
        snapshot.overlay_status.url = Some("private-overlay-url".to_string());
        let report = super::support_report(&snapshot, "1.4.0");
        let text = report.to_string();
        assert!(!text.contains("private-"));
        assert_eq!(report["appVersion"], "1.4.0");
        assert_eq!(report["monitoring"], false);
        assert!(report["generatedAt"].is_string());
        assert!(report["accessTokenReady"].is_boolean());
    }
}
