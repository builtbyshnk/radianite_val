use crate::riot::{
    state::{
        now_timestamp, CoreStatus, CoreStatusKind, DiagnosticSnapshot, LiveSnapshot, MatchPhase,
        PartySnapshot, PlayerIdentity, RankSnapshot, ScoreSnapshot,
    },
    valorant_client::ValorantContentCache,
    watcher::PollResult,
};

pub struct MockSource {
    tick: u32,
    seed: u64,
    snapshot: LiveSnapshot,
}

impl MockSource {
    pub fn new() -> Self {
        Self {
            tick: 0,
            seed: chrono::Utc::now().timestamp_micros() as u64,
            snapshot: LiveSnapshot {
                phase: MatchPhase::Menus,
                is_idle: false,
                is_valid: true,
                player: PlayerIdentity {
                    puuid_present: true,
                    game_name: Some("ryujingubang".to_string()),
                    game_tag: Some("bmw".to_string()),
                },
                region: Some("ap".to_string()),
                shard: Some("ap".to_string()),
                queue_id: Some("competitive".to_string()),
                queue_key: Some("competitive".to_string()),
                party: PartySnapshot {
                    state: Some("DEFAULT".to_string()),
                    size: Some(2),
                    max_size: Some(5),
                    accessibility: Some("OPEN".to_string()),
                },
                map_id: None,
                map_name: None,
                agent_id: None,
                agent_name: None,
                score: None,
                rank: None,
                match_id: None,
                session_started_at: None,
                updated_at: now_timestamp(),
            },
        }
    }

    fn random(&mut self, max: u32) -> u32 {
        self.seed = self.seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        ((self.seed >> 32) as u32) % max
    }

    pub async fn poll(&mut self, cache: ValorantContentCache) -> PollResult {
        let mut result = self.next();
        if let Ok(content) = cache.get("en-US").await {
            if let Some(rank) = result.live_snapshot.as_mut().and_then(|s| s.rank.as_mut()) {
                rank.tier_name = rank
                    .tier
                    .and_then(|tier| content.competitive_tier_name(tier));
                rank.icon_url = rank
                    .tier
                    .and_then(|tier| content.competitive_tier_icon_url(tier));
            }
        }
        result
    }

    fn next(&mut self) -> PollResult {
        let step = self.tick % 24;
        if step == 0 {
            let maps = [
                ("/Game/Maps/Ascent/Ascent", "Ascent"),
                ("/Game/Maps/Bonsai/Bonsai", "Split"),
                ("/Game/Maps/Triad/Triad", "Haven"),
            ];
            let agents = [
                ("add6443a-41bd-e414-f6ad-e58d267f4e95", "Jett"),
                ("a3bfb853-43b2-7238-a4f1-ad90e9e46bcc", "Reyna"),
                ("569fdd95-4d10-43ab-ca70-79becc718b46", "Sage"),
                ("ddd5a15c-4fbe-42fa-3789-11a55ca5ee04", "Hush"),
            ];
            let (map_id, map_name) = maps[self.random(maps.len() as u32) as usize];
            let (agent_id, agent_name) = agents[self.random(agents.len() as u32) as usize];
            self.snapshot.map_id = Some(map_id.to_string());
            self.snapshot.map_name = Some(map_name.to_string());
            self.snapshot.agent_id = Some(agent_id.to_string());
            self.snapshot.agent_name = Some(agent_name.to_string());
            self.snapshot.rank = Some(RankSnapshot {
                tier: Some(3 + self.random(22)),
                tier_name: None,
                ranked_rating: Some(self.random(100) as i32),
                last_match_delta: Some(self.random(51) as i32 - 25),
                leaderboard_rank: None,
                season_id: None,
                icon_url: None,
            });
        }
        self.snapshot.phase = match step {
            0..=2 => MatchPhase::Menus,
            3..=5 => MatchPhase::Matchmaking,
            6..=8 => MatchPhase::Pregame,
            _ => MatchPhase::Ingame,
        };
        self.snapshot.match_id = (step >= 6).then(|| format!("mock-match-{}", self.tick / 24));
        self.snapshot.score = (step >= 9).then(|| ScoreSnapshot {
            ally: self.random(13),
            enemy: self.random(13),
        });
        self.snapshot.updated_at = now_timestamp();
        self.tick += 1;

        let status = CoreStatus::new(CoreStatusKind::ValorantReady, true, "Development mock data");
        let mut diagnostics = DiagnosticSnapshot::empty(status.clone());
        diagnostics
            .game_name
            .clone_from(&self.snapshot.player.game_name);
        diagnostics
            .game_tag
            .clone_from(&self.snapshot.player.game_tag);
        diagnostics.region.clone_from(&self.snapshot.region);
        diagnostics.shard.clone_from(&self.snapshot.shard);
        PollResult {
            status,
            diagnostics,
            live_snapshot: Some(self.snapshot.clone()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cycles_through_phases_with_valid_rank_and_match_data() {
        let mut source = MockSource::new();
        for tick in 0..49 {
            let result = source.next();
            let snapshot = result.live_snapshot.unwrap();
            let step = tick % 24;
            assert_eq!(snapshot.match_id.is_some(), step >= 6);
            assert_eq!(snapshot.score.is_some(), step >= 9);
            assert!((3..=24).contains(&snapshot.rank.unwrap().tier.unwrap()));
            assert_eq!(snapshot.phase == MatchPhase::Ingame, step >= 9);
            assert!(!result.diagnostics.access_token_ready);
        }
    }

    #[tokio::test]
    async fn hush_mock_reaches_agent_select_and_ingame_presence() {
        let state = crate::app_state::AppState::new();
        let mut source = MockSource::new();
        source.seed = 1;
        let mut checked_pregame = false;
        for _ in 0..24 * 32 {
            let result = source.next();
            let snapshot = result.live_snapshot.as_ref().unwrap();
            if snapshot.agent_name.as_deref() != Some("Hush") {
                continue;
            }
            assert_eq!(
                snapshot.agent_id.as_deref(),
                Some("ddd5a15c-4fbe-42fa-3789-11a55ca5ee04")
            );
            let phase = snapshot.phase.clone();
            if !matches!(phase, MatchPhase::Pregame | MatchPhase::Ingame) {
                continue;
            }
            state.apply_poll_result(result).await;
            let preview = state.rpc_status().await.preview.expect("Hush RPC preview");
            let art = if phase == MatchPhase::Pregame {
                checked_pregame = true;
                preview.large_image_url
            } else {
                assert!(checked_pregame);
                preview.small_image_url
            };
            assert!(art.is_some(), "Hush artwork should reach the RPC preview");
            if phase == MatchPhase::Ingame {
                return;
            }
        }
        panic!("development mode should include Hush");
    }

    #[tokio::test]
    async fn mock_snapshot_reaches_rpc_and_overlay_without_riot_credentials() {
        let state = crate::app_state::AppState::new();
        assert_eq!(state.dev_mode(), Some(false));
        let mut source = MockSource::new();
        state.apply_poll_result(source.next()).await;

        let snapshot = state.app_snapshot().await;
        assert!(snapshot.rpc_status.preview.is_some());
        let overlay = crate::overlay::overlay_snapshot_from_parts(
            &snapshot.diagnostics.status,
            snapshot.live_snapshot,
            "nightfall".to_string(),
            false,
        );
        assert_eq!(overlay.status, "ready");
        assert!(overlay.rank.is_some());
        assert_eq!(overlay.player.game_name.as_deref(), Some("ryujingubang"));
        assert_eq!(overlay.player.game_tag.as_deref(), Some("bmw"));
    }
}
