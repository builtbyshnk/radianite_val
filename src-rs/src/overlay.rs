use serde::{Deserialize, Serialize};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
};

use crate::{
    app_state::AppState,
    riot::state::{
        now_timestamp, CoreStatus, CoreStatusKind, LiveSnapshot, OverlayStatus, PlayerIdentity,
        RankSnapshot,
    },
};

const DEFAULT_OVERLAY_PORT: u16 = 48271;
const BIND_HOST: &str = "127.0.0.1";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayConfig {
    pub theme: String,
    pub show_player_id: bool,
}

impl Default for OverlayConfig {
    fn default() -> Self {
        Self {
            theme: "default".to_string(),
            show_player_id: true,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlaySnapshot {
    pub status: &'static str,
    pub message: String,
    pub rank: Option<RankSnapshot>,
    pub player: PlayerIdentity,
    pub updated_at: String,
}

pub async fn run_overlay_server(state: AppState) {
    let listener = match bind_listener().await {
        Ok(listener) => listener,
        Err(message) => {
            state
                .set_overlay_status(OverlayStatus::new(false, None, None, message))
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
                    format!("OBS overlay server address failed: {err}"),
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
            "OBS overlay server is running",
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
        "/overlay/state" => {
            let snapshot =
                overlay_snapshot_from_parts(&state.status().await, state.live_snapshot().await);
            let body = serde_json::to_string(&snapshot).unwrap_or_else(|err| {
                format!(
                    r#"{{"status":"error","message":"overlay JSON serialization failed: {err}","rank":null,"player":{{"puuidPresent":false,"gameName":null,"gameTag":null}},"updatedAt":"{}"}}"#,
                    now_timestamp()
                )
            });
            write_response(&mut stream, 200, "application/json; charset=utf-8", &body).await
        }
        "/overlay/config" => {
            let config = state.overlay_config().await;
            let body = serde_json::to_string(&config)
                .unwrap_or_else(|_| r#"{"theme":"default","showPlayerId":true}"#.to_string());
            write_response(&mut stream, 200, "application/json; charset=utf-8", &body).await
        }
        "/favicon.ico" => write_response(&mut stream, 204, "text/plain; charset=utf-8", "").await,
        _ => write_response(&mut stream, 404, "text/plain; charset=utf-8", "Not found").await,
    }
}

pub fn overlay_snapshot_from_parts(
    core_status: &CoreStatus,
    live_snapshot: Option<LiveSnapshot>,
) -> OverlaySnapshot {
    if let Some(snapshot) = live_snapshot {
        if let Some(rank) = snapshot.rank {
            return OverlaySnapshot {
                status: "ready",
                message: "Rank data is available".to_string(),
                rank: Some(rank),
                player: snapshot.player,
                updated_at: snapshot.updated_at,
            };
        }

        return OverlaySnapshot {
            status: "waiting",
            message: "Waiting for competitive rank data".to_string(),
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
        message: core_status.message.clone(),
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

const OVERLAY_HTML: &str = r##"<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Radianite Rank Overlay</title>
  <style>
    /* ---- Base layer: every theme overrides these variables ---- */
    :root {
      color-scheme: dark;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: transparent;
    }

    body {
      --card-bg: linear-gradient(135deg, rgba(20, 24, 34, 0.94), rgba(12, 14, 20, 0.9));
      --card-border: 1px solid rgba(255, 255, 255, 0.1);
      --card-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
      --card-radius: 12px;
      --text: #f7f8fb;
      --subtext: rgba(255, 255, 255, 0.7);
      --rr: #ffffff;
      --accent: #8a5cf6;
      --accent-2: #c4a7ff;
      --accent-bar: linear-gradient(180deg, var(--accent), var(--accent-2));
      --accent-bar-width: 4px;
      --glow: radial-gradient(120% 140% at 0% 0%, rgba(138, 92, 246, 0.28), transparent 60%);
      --icon-bg: rgba(255, 255, 255, 0.05);
      --icon-border: 1px solid rgba(255, 255, 255, 0.1);
      --icon-radius: 10px;
      --icon-shadow: none;
      --delta-pos: linear-gradient(135deg, rgba(74, 222, 128, 0.95), rgba(34, 197, 94, 0.95));
      --delta-neg: linear-gradient(135deg, rgba(255, 80, 95, 0.96), rgba(220, 38, 38, 0.96));
      --delta-neutral: rgba(255, 255, 255, 0.1);
      --delta-text: #06140c;
      --delta-radius: 999px;
      --rank-font: 22px;
      --rr-font: 16px;
      --heading-font: Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif;
      --rank-weight: 800;
      --rank-transform: none;
      --rank-spacing: -0.01em;
      --rr-weight: 800;
      --sub-spacing: 0.16em;
      --text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      --scanline: none;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: transparent;
    }

    body {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 8px;
    }

    .card {
      position: relative;
      width: 344px;
      min-height: 74px;
      display: grid;
      grid-template-columns: 60px minmax(0, 1fr);
      gap: 12px;
      align-items: center;
      padding: 10px 14px 10px 12px;
      background: var(--card-bg);
      border: var(--card-border);
      border-radius: var(--card-radius);
      box-shadow: var(--card-shadow);
      color: var(--text);
      font-family: var(--heading-font);
      overflow: hidden;
    }

    /* Soft directional glow layer (per-theme via --glow). */
    .card::before {
      content: "";
      position: absolute;
      inset: 0;
      background: var(--glow);
      pointer-events: none;
      z-index: 0;
    }

    .card > * {
      position: relative;
      z-index: 1;
    }

    /* Left accent bar (per-theme via --accent-bar / width). */
    .card::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: var(--accent-bar-width);
      background: var(--accent-bar);
      pointer-events: none;
      z-index: 2;
    }

    .iconWrap {
      position: relative;
      width: 58px;
      height: 58px;
      display: grid;
      place-items: center;
      background: var(--icon-bg);
      border: var(--icon-border);
      border-radius: var(--icon-radius);
      box-shadow: var(--icon-shadow);
    }

    .icon {
      width: 52px;
      height: 52px;
      object-fit: contain;
      filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.5));
    }

    .fallbackIcon {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      background: var(--accent-bar);
      transform: rotate(45deg);
      box-shadow: 0 0 14px rgba(138, 92, 246, 0.45);
    }

    .content {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .topline {
      min-width: 0;
      display: flex;
      align-items: baseline;
      gap: 8px;
      line-height: 1;
    }

    .rank {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--rank-font);
      font-weight: var(--rank-weight);
      text-transform: var(--rank-transform);
      letter-spacing: var(--rank-spacing);
      text-shadow: var(--text-shadow);
    }

    .rr {
      flex: 0 0 auto;
      font-size: var(--rr-font);
      font-weight: var(--rr-weight);
      color: var(--rr);
      text-shadow: var(--text-shadow);
    }

    .subline {
      min-height: 14px;
      font-size: 11px;
      font-weight: 700;
      color: var(--subtext);
      text-transform: uppercase;
      letter-spacing: var(--sub-spacing);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .delta {
      width: max-content;
      max-width: 100%;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
      letter-spacing: 0.02em;
      color: var(--delta-text);
      background: var(--delta-pos);
      border-radius: var(--delta-radius);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }

    .delta.negative {
      background: var(--delta-neg);
      color: #fff;
    }

    .delta.neutral {
      background: var(--delta-neutral);
      color: var(--subtext);
      box-shadow: none;
    }

    .waiting .card {
      opacity: 0.9;
    }

    /* Privacy: hide player name/tag when showPlayerId is off. */
    body.hidePlayerId .subline {
      visibility: hidden;
    }

    /* =========================================================
       THEME: default - sleek violet glass HUD
       ========================================================= */
    /* uses the polished base variables as-is */

    /* =========================================================
       THEME: dark - high-contrast OLED slate
       ========================================================= */
    body[data-theme="dark"] {
      --card-bg: linear-gradient(180deg, rgba(10, 11, 15, 0.97), rgba(4, 5, 8, 0.97));
      --card-border: 1px solid rgba(255, 255, 255, 0.14);
      --card-shadow: 0 10px 28px rgba(0, 0, 0, 0.6);
      --card-radius: 10px;
      --accent: #e8e8ec;
      --accent-2: #9aa0aa;
      --glow: radial-gradient(130% 130% at 100% 0%, rgba(255, 255, 255, 0.08), transparent 55%);
      --icon-bg: rgba(255, 255, 255, 0.04);
      --icon-radius: 8px;
      --rr: #ffffff;
      --delta-pos: linear-gradient(135deg, #5eead4, #14b8a6);
      --delta-text: #04201b;
      --rank-spacing: 0.01em;
    }

    /* =========================================================
       THEME: light - clean frosted white card
       ========================================================= */
    body[data-theme="light"] {
      --card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(244, 246, 251, 0.95));
      --card-border: 1px solid rgba(15, 23, 42, 0.08);
      --card-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
      --card-radius: 14px;
      --text: #0f172a;
      --subtext: rgba(15, 23, 42, 0.55);
      --rr: #4338ca;
      --accent: #6366f1;
      --accent-2: #a855f7;
      --glow: radial-gradient(120% 140% at 0% 0%, rgba(99, 102, 241, 0.14), transparent 60%);
      --icon-bg: rgba(15, 23, 42, 0.04);
      --icon-border: 1px solid rgba(15, 23, 42, 0.06);
      --icon-radius: 12px;
      --delta-pos: linear-gradient(135deg, #34d399, #10b981);
      --delta-text: #052e1a;
      --delta-neutral: rgba(15, 23, 42, 0.07);
      --text-shadow: none;
    }

    /* =========================================================
       THEME: valorant - aggressive red tactical HUD (sharp)
       ========================================================= */
    body[data-theme="valorant"] {
      --card-bg: linear-gradient(115deg, rgba(13, 23, 31, 0.97) 0%, rgba(24, 12, 16, 0.96) 55%, rgba(40, 12, 18, 0.96) 100%);
      --card-border: 1px solid rgba(255, 70, 85, 0.5);
      --card-shadow: 0 0 0 1px rgba(255, 70, 85, 0.15), 0 10px 30px rgba(255, 70, 85, 0.22);
      --card-radius: 2px;
      --accent: #ff4655;
      --accent-2: #ff8a93;
      --accent-bar-width: 5px;
      --glow: radial-gradient(140% 160% at 100% 0%, rgba(255, 70, 85, 0.28), transparent 55%);
      --icon-bg: rgba(255, 70, 85, 0.1);
      --icon-border: 1px solid rgba(255, 70, 85, 0.45);
      --icon-radius: 2px;
      --rr: #ff5b69;
      --heading-font: "Segoe UI", Inter, system-ui, sans-serif;
      --rank-transform: uppercase;
      --rank-weight: 900;
      --rank-spacing: 0.02em;
      --rank-font: 20px;
      --delta-pos: linear-gradient(135deg, #ff4655, #c5102a);
      --delta-text: #fff;
      --delta-radius: 2px;
      --sub-spacing: 0.22em;
      --scanline: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0 1px, transparent 1px 3px);
    }
    body[data-theme="valorant"] .card::before {
      background: var(--glow), var(--scanline);
    }

    /* =========================================================
       THEME: valorant-purple - neon purple tactical HUD (sharp)
       ========================================================= */
    body[data-theme="valorant-purple"] {
      --card-bg: linear-gradient(115deg, rgba(15, 13, 28, 0.97) 0%, rgba(24, 14, 44, 0.96) 55%, rgba(38, 16, 64, 0.96) 100%);
      --card-border: 1px solid rgba(167, 99, 255, 0.5);
      --card-shadow: 0 0 0 1px rgba(167, 99, 255, 0.15), 0 10px 30px rgba(167, 99, 255, 0.25);
      --card-radius: 2px;
      --accent: #a763ff;
      --accent-2: #d9b8ff;
      --accent-bar-width: 5px;
      --glow: radial-gradient(140% 160% at 100% 0%, rgba(167, 99, 255, 0.3), transparent 55%);
      --icon-bg: rgba(167, 99, 255, 0.12);
      --icon-border: 1px solid rgba(167, 99, 255, 0.45);
      --icon-radius: 2px;
      --rr: #c9a7ff;
      --heading-font: "Segoe UI", Inter, system-ui, sans-serif;
      --rank-transform: uppercase;
      --rank-weight: 900;
      --rank-spacing: 0.02em;
      --rank-font: 20px;
      --delta-pos: linear-gradient(135deg, #a763ff, #6d28d9);
      --delta-text: #fff;
      --delta-radius: 2px;
      --sub-spacing: 0.22em;
      --scanline: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0 1px, transparent 1px 3px);
    }
    body[data-theme="valorant-purple"] .card::before {
      background: var(--glow), var(--scanline);
    }

    /* =========================================================
       THEME: minimal - compact pill, icon + rank name only
       ========================================================= */
    body[data-theme="minimal"] {
      --card-bg: rgba(10, 12, 18, 0.82);
      --card-border: 1px solid rgba(255, 255, 255, 0.12);
      --card-shadow: 0 8px 22px rgba(0, 0, 0, 0.4);
      --card-radius: 999px;
      --accent-bar-width: 0px;
      --glow: none;
      --icon-bg: transparent;
      --icon-border: 0;
      --rank-font: 16px;
      --rank-weight: 700;
    }
    body[data-theme="minimal"] .card {
      width: max-content;
      min-width: 0;
      min-height: 0;
      grid-template-columns: 36px minmax(0, 1fr);
      gap: 8px;
      padding: 6px 16px 6px 8px;
      backdrop-filter: blur(8px);
    }
    body[data-theme="minimal"] .iconWrap {
      width: 34px;
      height: 34px;
    }
    body[data-theme="minimal"] .icon {
      width: 32px;
      height: 32px;
    }
    body[data-theme="minimal"] .rr,
    body[data-theme="minimal"] .delta,
    body[data-theme="minimal"] .subline {
      display: none;
    }

    /* =========================================================
       THEME: pink - soft kawaii pink with rounded glass
       ========================================================= */
    body[data-theme="pink"] {
      --card-bg: linear-gradient(135deg, rgba(255, 182, 217, 0.95), rgba(255, 138, 197, 0.92) 55%, rgba(214, 96, 168, 0.92));
      --card-border: 1px solid rgba(255, 255, 255, 0.55);
      --card-shadow: 0 12px 30px rgba(236, 72, 153, 0.4);
      --card-radius: 20px;
      --text: #5a1138;
      --subtext: rgba(90, 17, 56, 0.7);
      --rr: #ffffff;
      --accent: #ffffff;
      --accent-2: #ffe3f1;
      --accent-bar-width: 0px;
      --glow: radial-gradient(120% 140% at 50% -20%, rgba(255, 255, 255, 0.55), transparent 60%);
      --icon-bg: rgba(255, 255, 255, 0.4);
      --icon-border: 1px solid rgba(255, 255, 255, 0.65);
      --icon-radius: 16px;
      --icon-shadow: 0 6px 16px rgba(236, 72, 153, 0.35);
      --heading-font: "Segoe UI", Inter, system-ui, sans-serif;
      --rank-weight: 800;
      --delta-pos: linear-gradient(135deg, #ff7ab8, #ff4f97);
      --delta-text: #fff;
      --delta-neg: linear-gradient(135deg, #c2185b, #8e1450);
      --delta-radius: 999px;
      --text-shadow: 0 1px 1px rgba(255, 255, 255, 0.4);
    }
    body[data-theme="pink"] .delta::before {
      content: "\2665 ";
    }

    /* =========================================================
       THEME: purple - dreamy lavender gradient with rounded glass
       ========================================================= */
    body[data-theme="purple"] {
      --card-bg: linear-gradient(135deg, rgba(196, 167, 255, 0.94), rgba(139, 92, 246, 0.92) 55%, rgba(91, 33, 182, 0.94));
      --card-border: 1px solid rgba(255, 255, 255, 0.45);
      --card-shadow: 0 12px 30px rgba(124, 58, 237, 0.45);
      --card-radius: 20px;
      --text: #ffffff;
      --subtext: rgba(255, 255, 255, 0.82);
      --rr: #f3edff;
      --accent: #ffffff;
      --accent-2: #e9deff;
      --accent-bar-width: 0px;
      --glow: radial-gradient(120% 140% at 50% -20%, rgba(255, 255, 255, 0.45), transparent 60%);
      --icon-bg: rgba(255, 255, 255, 0.22);
      --icon-border: 1px solid rgba(255, 255, 255, 0.5);
      --icon-radius: 16px;
      --icon-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
      --heading-font: "Segoe UI", Inter, system-ui, sans-serif;
      --delta-pos: linear-gradient(135deg, #c4a7ff, #8b5cf6);
      --delta-text: #fff;
      --delta-neg: linear-gradient(135deg, #7c3aed, #4c1d95);
      --delta-radius: 999px;
      --text-shadow: 0 1px 3px rgba(76, 29, 149, 0.5);
    }
  </style>
</head>
<body>
  <section class="card" aria-label="Radianite rank overlay">
    <div class="iconWrap">
      <img class="icon" id="rankIcon" alt="" hidden />
      <div class="fallbackIcon" id="fallbackIcon"></div>
    </div>
    <div class="content">
      <div class="topline">
        <div class="rank" id="rankName">Waiting</div>
        <div class="rr" id="rankRR"></div>
      </div>
      <div class="subline" id="subline">Radianite overlay</div>
      <div class="delta neutral" id="delta">Waiting for rank</div>
    </div>
  </section>
  <script>
    const rankIcon = document.getElementById("rankIcon");
    const fallbackIcon = document.getElementById("fallbackIcon");
    const rankName = document.getElementById("rankName");
    const rankRR = document.getElementById("rankRR");
    const subline = document.getElementById("subline");
    const delta = document.getElementById("delta");

    let showPlayerId = true;

    function setWaiting(message) {
      document.body.classList.add("waiting");
      rankIcon.hidden = true;
      fallbackIcon.hidden = false;
      rankName.textContent = "Waiting";
      rankRR.textContent = "";
      subline.textContent = "Radianite overlay";
      delta.textContent = message || "Waiting for rank";
      delta.className = "delta neutral";
    }

    function formatDelta(value) {
      if (value > 0) return "Last Match: +" + value + "pts";
      if (value < 0) return "Last Match: " + value + "pts";
      return "Last Match: 0pts";
    }

    function render(data) {
      if (!data || data.status !== "ready" || !data.rank) {
        setWaiting(data && data.message);
        return;
      }

      document.body.classList.remove("waiting");
      const rank = data.rank;
      rankName.textContent = rank.tierName || (rank.tier ? "Tier " + rank.tier : "Unrated");
      rankRR.textContent = typeof rank.rankedRating === "number" ? rank.rankedRating + "RR" : "";
      subline.textContent = data.player && data.player.gameName
        ? data.player.gameName + (data.player.gameTag ? "#" + data.player.gameTag : "")
        : "Current rank";

      if (rank.iconUrl) {
        rankIcon.src = rank.iconUrl;
        rankIcon.hidden = false;
        fallbackIcon.hidden = true;
      } else {
        rankIcon.hidden = true;
        fallbackIcon.hidden = false;
      }

      if (typeof rank.lastMatchDelta === "number") {
        delta.textContent = formatDelta(rank.lastMatchDelta);
        delta.className = rank.lastMatchDelta < 0 ? "delta negative" : "delta";
      } else {
        delta.textContent = "Last Match: unavailable";
        delta.className = "delta neutral";
      }
    }

    function applyConfig(config) {
      const theme = config && typeof config.theme === "string" ? config.theme : "default";
      if (theme === "default") {
        delete document.body.dataset.theme;
      } else {
        document.body.dataset.theme = theme;
      }
      showPlayerId = !(config && config.showPlayerId === false);
      document.body.classList.toggle("hidePlayerId", !showPlayerId);
    }

    async function refresh() {
      try {
        const response = await fetch("/overlay/state", { cache: "no-store" });
        render(await response.json());
      } catch (_err) {
        setWaiting("Overlay disconnected");
      }
    }

    async function refreshConfig() {
      try {
        const response = await fetch("/overlay/config", { cache: "no-store" });
        applyConfig(await response.json());
      } catch (_err) {
        /* keep last applied config */
      }
    }

    refreshConfig();
    refresh();
    setInterval(refresh, 2000);
    setInterval(refreshConfig, 2000);
  </script>
</body>
</html>
"##;

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{overlay_snapshot_from_parts, OverlayConfig};
    use crate::riot::state::{
        CoreStatus, CoreStatusKind, LiveSnapshot, MatchPhase, PartySnapshot, PlayerIdentity,
        RankSnapshot,
    };

    fn live_snapshot() -> LiveSnapshot {
        LiveSnapshot {
            phase: MatchPhase::Menus,
            player: PlayerIdentity {
                puuid_present: true,
                game_name: Some("name".to_string()),
                game_tag: Some("tag".to_string()),
            },
            region: Some("ap".to_string()),
            shard: Some("ap".to_string()),
            queue_id: Some("competitive".to_string()),
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
    fn renders_ready_rank_overlay_state() {
        let status = CoreStatus::new(CoreStatusKind::ValorantReady, true, "ready");
        let rendered =
            serde_json::to_value(overlay_snapshot_from_parts(&status, Some(live_snapshot())))
                .expect("overlay state should serialize");

        assert_eq!(rendered["status"], "ready");
        assert_eq!(rendered["rank"]["tierName"], "Diamond 1");
        assert_eq!(rendered["rank"]["rankedRating"], 20);
        assert_eq!(rendered["rank"]["lastMatchDelta"], 20);
        assert_eq!(rendered["rank"]["iconUrl"], "https://example.test/rank.png");
    }

    #[test]
    fn overlay_state_excludes_internal_sensitive_fields() {
        let status = CoreStatus::new(CoreStatusKind::ValorantReady, true, "ready");
        let rendered =
            serde_json::to_string(&overlay_snapshot_from_parts(&status, Some(live_snapshot())))
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

        let rendered = serde_json::to_value(overlay_snapshot_from_parts(&status, Some(snapshot)))
            .expect("overlay state should serialize");

        assert_eq!(rendered["status"], "waiting");
        assert_eq!(rendered["rank"], json!(null));
    }

    #[test]
    fn overlay_config_default_is_default_theme_with_player_id() {
        let config = OverlayConfig::default();
        assert_eq!(config.theme, "default");
        assert!(config.show_player_id);
    }

    #[test]
    fn overlay_config_serializes_camel_case() {
        let rendered = serde_json::to_value(OverlayConfig {
            theme: "valorant".to_string(),
            show_player_id: false,
        })
        .expect("overlay config should serialize");

        assert_eq!(rendered["theme"], "valorant");
        assert_eq!(rendered["showPlayerId"], false);

        let parsed: OverlayConfig =
            serde_json::from_value(rendered).expect("overlay config should deserialize");
        assert_eq!(parsed.theme, "valorant");
        assert!(!parsed.show_player_id);
    }
}
