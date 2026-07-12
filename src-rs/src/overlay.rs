use rust_i18n::t;
use serde::Serialize;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
};

use crate::{
    app_state::AppState,
    riot::state::{
        now_timestamp, CoreStatus, CoreStatusKind, LiveSnapshot, LocalizedMessage, OverlayStatus,
        PlayerIdentity, RankSnapshot,
    },
};

const DEFAULT_OVERLAY_PORT: u16 = 48271;
const BIND_HOST: &str = "127.0.0.1";
const OVERLAY_HTML: &str = include_str!("overlay/index.html");
const OVERLAY_CSS: &str = include_str!("overlay/overlay.css");
const OVERLAY_JS: &str = include_str!("overlay/overlay.js");

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlaySnapshot {
    pub status: &'static str,
    pub message: String,
    pub theme: String,
    pub hide_details: bool,
    pub rank: Option<RankSnapshot>,
    pub player: PlayerIdentity,
    pub updated_at: String,
}

pub async fn run_overlay_server(state: AppState) {
    let listener = match bind_listener().await {
        Ok(listener) => listener,
        Err(message) => {
            state
                .set_overlay_status(OverlayStatus::new(
                    false,
                    None,
                    None,
                    LocalizedMessage::technical("status.overlay.failed", message),
                ))
                .await;
            return;
        }
    };

    let port = match listener.local_addr() {
        Ok(address) => address.port(),
        Err(err) => {
            state
                .set_overlay_status(OverlayStatus::new(
                    false,
                    None,
                    None,
                    LocalizedMessage::technical(
                        "status.overlay.failed",
                        format!("OBS overlay server address failed: {err}"),
                    ),
                ))
                .await;
            return;
        }
    };
    let url = format!("http://{BIND_HOST}:{port}/overlay/rank");

    state
        .set_overlay_status(OverlayStatus::new(
            true,
            Some(url),
            Some(port),
            LocalizedMessage::key("status.overlay.running"),
        ))
        .await;

    loop {
        let Ok((stream, _peer)) = listener.accept().await else {
            continue;
        };
        let state = state.clone();
        tokio::spawn(async move {
            let _ = handle_connection(stream, state).await;
        });
    }
}

async fn bind_listener() -> Result<TcpListener, String> {
    TcpListener::bind((BIND_HOST, DEFAULT_OVERLAY_PORT))
        .await
        .map_err(|err| {
            format!(
                "OBS overlay port {DEFAULT_OVERLAY_PORT} is already in use or unavailable: {err}"
            )
        })
}

async fn handle_connection(mut stream: TcpStream, state: AppState) -> std::io::Result<()> {
    let mut buffer = [0_u8; 4096];
    let read = stream.read(&mut buffer).await?;
    if read == 0 {
        return Ok(());
    }

    let request = String::from_utf8_lossy(&buffer[..read]);
    let path = request
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .unwrap_or("/");

    match path.split('?').next().unwrap_or(path) {
        "/overlay/rank" => {
            write_response(&mut stream, 200, "text/html; charset=utf-8", OVERLAY_HTML).await
        }
        "/overlay/overlay.css" => {
            write_response(&mut stream, 200, "text/css; charset=utf-8", OVERLAY_CSS).await
        }
        "/overlay/overlay.js" => {
            write_response(
                &mut stream,
                200,
                "text/javascript; charset=utf-8",
                OVERLAY_JS,
            )
            .await
        }
        "/overlay/state" => {
            let snapshot = overlay_snapshot_from_parts(
                &state.status().await,
                state.live_snapshot().await,
                state.overlay_theme().await,
                state.overlay_hide_details().await,
            );
            let body = serde_json::to_string(&snapshot).unwrap_or_else(|err| {
                format!(
                    r#"{{"status":"error","message":"overlay JSON serialization failed: {err}","rank":null,"player":{{"puuidPresent":false,"gameName":null,"gameTag":null}},"updatedAt":"{}"}}"#,
                    now_timestamp()
                )
            });
            write_response(&mut stream, 200, "application/json; charset=utf-8", &body).await
        }
        "/favicon.ico" => write_response(&mut stream, 204, "text/plain; charset=utf-8", "").await,
        _ => write_response(&mut stream, 404, "text/plain; charset=utf-8", "Not found").await,
    }
}

pub fn overlay_snapshot_from_parts(
    core_status: &CoreStatus,
    live_snapshot: Option<LiveSnapshot>,
    theme: String,
    hide_details: bool,
) -> OverlaySnapshot {
    if let Some(snapshot) = live_snapshot {
        if let Some(rank) = snapshot.rank {
            return OverlaySnapshot {
                status: "ready",
                message: t!("overlay.rankAvailable").to_string(),
                theme,
                hide_details,
                rank: Some(rank),
                player: snapshot.player,
                updated_at: snapshot.updated_at,
            };
        }

        return OverlaySnapshot {
            status: "waiting",
            message: t!("overlay.waitingRank").to_string(),
            theme,
            hide_details,
            rank: None,
            player: snapshot.player,
            updated_at: snapshot.updated_at,
        };
    }

    let status = match core_status.kind {
        CoreStatusKind::AuthExpired | CoreStatusKind::Error => "error",
        _ => "waiting",
    };

    OverlaySnapshot {
        status,
        message: core_status
            .message
            .detail
            .clone()
            .unwrap_or_else(|| t!(core_status.message.key.as_str()).to_string()),
        theme,
        hide_details,
        rank: None,
        player: PlayerIdentity::default(),
        updated_at: core_status.updated_at.clone(),
    }
}

async fn write_response(
    stream: &mut TcpStream,
    status_code: u16,
    content_type: &str,
    body: &str,
) -> std::io::Result<()> {
    let reason = match status_code {
        200 => "OK",
        204 => "No Content",
        404 => "Not Found",
        _ => "OK",
    };
    let bytes = body.as_bytes();
    let response = format!(
        "HTTP/1.1 {status_code} {reason}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store, no-cache, must-revalidate\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n",
        bytes.len()
    );

    stream.write_all(response.as_bytes()).await?;
    stream.write_all(bytes).await?;
    stream.shutdown().await
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{overlay_snapshot_from_parts, OVERLAY_CSS, OVERLAY_HTML, OVERLAY_JS};
    use crate::riot::state::{
        CoreStatus, CoreStatusKind, LiveSnapshot, MatchPhase, PartySnapshot, PlayerIdentity,
        RankSnapshot,
    };

    fn live_snapshot() -> LiveSnapshot {
        LiveSnapshot {
            phase: MatchPhase::Menus,
            is_idle: false,
            is_valid: true,
            player: PlayerIdentity {
                puuid_present: true,
                game_name: Some("name".to_string()),
                game_tag: Some("tag".to_string()),
            },
            region: Some("ap".to_string()),
            shard: Some("ap".to_string()),
            queue_id: Some("competitive".to_string()),
            queue_key: Some("competitive".to_string()),
            party: PartySnapshot {
                state: None,
                size: Some(1),
                max_size: Some(5),
                accessibility: None,
            },
            map_id: None,
            map_name: None,
            agent_id: None,
            agent_name: None,
            score: None,
            rank: Some(RankSnapshot {
                tier: Some(24),
                tier_name: Some("Diamond 1".to_string()),
                ranked_rating: Some(20),
                last_match_delta: Some(20),
                leaderboard_rank: None,
                season_id: Some("act".to_string()),
                icon_url: Some("https://example.test/rank.png".to_string()),
            }),
            match_id: None,
            session_started_at: None,
            updated_at: "2026-06-26T10:00:00.000Z".to_string(),
        }
    }

    #[test]
    fn embeds_themeable_overlay_assets() {
        assert!(OVERLAY_HTML.contains("/overlay/overlay.css"));
        assert!(OVERLAY_HTML.contains("/overlay/overlay.js"));
        assert!(OVERLAY_JS.contains("themes.has(data?.theme)"));
        for theme in ["catppuccin", "evergreen", "solarized", "porcelain", "rose"] {
            assert!(OVERLAY_CSS.contains(&format!(r#"data-theme="{theme}""#)));
        }
    }

    #[test]
    fn renders_ready_rank_overlay_state() {
        let status = CoreStatus::new(CoreStatusKind::ValorantReady, true, "ready");
        let rendered = serde_json::to_value(overlay_snapshot_from_parts(
            &status,
            Some(live_snapshot()),
            "rose".to_string(),
            true,
        ))
        .expect("overlay state should serialize");

        assert_eq!(rendered["status"], "ready");
        assert_eq!(rendered["rank"]["tierName"], "Diamond 1");
        assert_eq!(rendered["rank"]["rankedRating"], 20);
        assert_eq!(rendered["rank"]["lastMatchDelta"], 20);
        assert_eq!(rendered["rank"]["iconUrl"], "https://example.test/rank.png");
        assert_eq!(rendered["hideDetails"], true);
        assert_eq!(rendered["theme"], "rose");
    }

    #[test]
    fn overlay_state_excludes_internal_sensitive_fields() {
        let status = CoreStatus::new(CoreStatusKind::ValorantReady, true, "ready");
        let rendered = serde_json::to_string(&overlay_snapshot_from_parts(
            &status,
            Some(live_snapshot()),
            "nightfall".to_string(),
            false,
        ))
        .expect("overlay state should serialize");

        assert!(!rendered.contains("accessToken"));
        assert!(!rendered.contains("entitlement"));
        assert!(!rendered.contains("lockfile"));
        assert!(!rendered.contains("password"));
        assert!(!rendered.contains("privatePresence"));
    }

    #[test]
    fn renders_waiting_without_rank() {
        let status = CoreStatus::new(CoreStatusKind::ValorantReady, true, "ready");
        let mut snapshot = live_snapshot();
        snapshot.rank = None;

        let rendered = serde_json::to_value(overlay_snapshot_from_parts(
            &status,
            Some(snapshot),
            "nightfall".to_string(),
            false,
        ))
        .expect("overlay state should serialize");

        assert_eq!(rendered["status"], "waiting");
        assert_eq!(rendered["rank"], json!(null));
    }
}
