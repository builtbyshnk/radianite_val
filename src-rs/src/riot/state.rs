use chrono::{SecondsFormat, Utc};
use serde::{Deserialize, Serialize};

pub fn now_timestamp() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum CoreStatusKind {
    NoRiotInstall,
    RiotClientClosed,
    RiotClientOnly,
    ValorantLaunching,
    ValorantReady,
    AuthExpired,
    Disconnected,
    Degraded,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CoreStatus {
    pub kind: CoreStatusKind,
    pub message: String,
    pub monitored: bool,
    pub updated_at: String,
}

impl CoreStatus {
    pub fn new(kind: CoreStatusKind, monitored: bool, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
            monitored,
            updated_at: now_timestamp(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MatchPhase {
    Menus,
    Matchmaking,
    Pregame,
    Ingame,
    Range,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct PlayerIdentity {
    pub puuid_present: bool,
    pub game_name: Option<String>,
    pub game_tag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PartySnapshot {
    pub state: Option<String>,
    pub size: Option<u32>,
    pub max_size: Option<u32>,
    pub accessibility: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScoreSnapshot {
    pub ally: u32,
    pub enemy: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RankSnapshot {
    pub tier: Option<u32>,
    pub tier_name: Option<String>,
    pub ranked_rating: Option<i32>,
    pub leaderboard_rank: Option<u32>,
    pub season_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LiveSnapshot {
    pub phase: MatchPhase,
    pub player: PlayerIdentity,
    pub region: Option<String>,
    pub shard: Option<String>,
    pub queue_id: Option<String>,
    pub party: PartySnapshot,
    pub map_id: Option<String>,
    pub map_name: Option<String>,
    pub agent_id: Option<String>,
    pub agent_name: Option<String>,
    pub score: Option<ScoreSnapshot>,
    pub rank: Option<RankSnapshot>,
    pub match_id: Option<String>,
    pub session_started_at: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticSnapshot {
    pub status: CoreStatus,
    pub riot_installs_json_exists: bool,
    pub riot_installs_path: Option<String>,
    pub lockfile_exists: bool,
    pub lockfile_path: Option<String>,
    pub lockfile_pid: Option<u32>,
    pub lockfile_protocol: Option<String>,
    pub lockfile_port_present: bool,
    pub local_api_ready: bool,
    pub riot_client_sessions_status: Option<u16>,
    pub session_product_ids: Vec<String>,
    pub valorant_session_present: bool,
    pub region: Option<String>,
    pub shard: Option<String>,
    pub client_version: Option<String>,
    pub puuid_present: bool,
    pub game_name: Option<String>,
    pub game_tag: Option<String>,
    pub access_token_ready: bool,
    pub entitlement_token_ready: bool,
    pub last_error: Option<String>,
    pub updated_at: String,
}

impl DiagnosticSnapshot {
    pub fn empty(status: CoreStatus) -> Self {
        Self {
            status,
            riot_installs_json_exists: false,
            riot_installs_path: None,
            lockfile_exists: false,
            lockfile_path: None,
            lockfile_pid: None,
            lockfile_protocol: None,
            lockfile_port_present: false,
            local_api_ready: false,
            riot_client_sessions_status: None,
            session_product_ids: Vec::new(),
            valorant_session_present: false,
            region: None,
            shard: None,
            client_version: None,
            puuid_present: false,
            game_name: None,
            game_tag: None,
            access_token_ready: false,
            entitlement_token_ready: false,
            last_error: None,
            updated_at: now_timestamp(),
        }
    }

    pub fn touch(&mut self) {
        self.updated_at = now_timestamp();
        self.status.updated_at = self.updated_at.clone();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RpcStatus {
    pub enabled: bool,
    pub connected: bool,
    pub configured: bool,
    pub message: String,
    pub updated_at: String,
}

impl RpcStatus {
    pub fn new(
        enabled: bool,
        connected: bool,
        configured: bool,
        message: impl Into<String>,
    ) -> Self {
        Self {
            enabled,
            connected,
            configured,
            message: message.into(),
            updated_at: now_timestamp(),
        }
    }
}
