use tauri::{AppHandle, Emitter, State};

use crate::{
    app_state::AppState,
    riot::state::{CoreStatus, DiagnosticSnapshot, LiveSnapshot, RpcStatus},
};

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
