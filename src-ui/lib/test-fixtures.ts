import { mockIPC, mockWindows } from "@tauri-apps/api/mocks"

import type {
  AppSnapshot,
  CoreStatus,
  LiveSnapshot,
  RpcStatus,
  Settings,
  ValorantPresentation,
} from "@/lib/types"

const query = new URLSearchParams(location.search)
const fixture = query.get("fixture") ?? "disconnected"

const settings: Settings = {
  runAtBoot: false,
  minimizeToTray: true,
  enableRpcOnStart: true,
  overlayTheme: "nightfall",
  overlayHideDetails: false,
  uiLocale: "en-US",
  rpcLocale: "en-US",
}

const status = (kind: CoreStatus["kind"], monitored = true): CoreStatus => ({
  kind,
  monitored,
  message: {
    key: `status.message.${kind === "valorantReady" ? "valorantReady" : "riotClientClosed"}`,
  },
  updatedAt: "2026-01-15T12:00:00.000Z",
})

const liveSnapshot = (phase: LiveSnapshot["phase"]): LiveSnapshot => ({
  phase,
  player: { puuidPresent: true, gameName: "Radianite", gameTag: "DEV" },
  region: "na",
  shard: "na",
  queueId: "competitive",
  queueKey: "competitive",
  party: { state: "DEFAULT", size: 3, maxSize: 5, accessibility: "OPEN" },
  mapId: "Ascent",
  mapName: "Ascent",
  agentId: "jett",
  agentName: "Jett",
  score: phase === "ingame" ? { ally: 8, enemy: 6 } : null,
  rank: { tier: 18, tierName: "Diamond 3", rankedRating: 72 },
  matchId: "fixture-match",
  sessionStartedAt: "2026-01-15T11:45:00.000Z",
  updatedAt: "2026-01-15T12:00:00.000Z",
})

const phase =
  fixture === "live"
    ? "ingame"
    : fixture === "matchmaking"
      ? "matchmaking"
      : fixture === "menus"
        ? "menus"
        : null
const snapshot = phase ? liveSnapshot(phase) : null
const coreStatus = phase
  ? status("valorantReady")
  : status("riotClientClosed", false)
const rpcStatus: RpcStatus = {
  enabled: true,
  connected: Boolean(snapshot),
  configured: true,
  locale: "en-US",
  message: { key: snapshot ? "status.rpc.connected" : "status.rpc.ready" },
  preview: snapshot
    ? {
        name: "VALORANT",
        details: "Competitive",
        state: "Ascent",
        startedAt: 1_768_478_400_000,
      }
    : null,
  updatedAt: "2026-01-15T12:00:00.000Z",
}

const appSnapshot: AppSnapshot = {
  diagnostics: {
    status: coreStatus,
    riotInstallsJsonExists: Boolean(snapshot),
    lockfileExists: Boolean(snapshot),
    lockfilePortPresent: Boolean(snapshot),
    localApiReady: Boolean(snapshot),
    sessionProductIds: snapshot ? ["valorant"] : [],
    valorantSessionPresent: Boolean(snapshot),
    region: snapshot?.region,
    shard: snapshot?.shard,
    clientVersion: snapshot ? "release-10.01" : null,
    puuidPresent: Boolean(snapshot),
    gameName: snapshot?.player.gameName,
    gameTag: snapshot?.player.gameTag,
    accessTokenReady: Boolean(snapshot),
    entitlementTokenReady: Boolean(snapshot),
    updatedAt: "2026-01-15T12:00:00.000Z",
  },
  liveSnapshot: snapshot,
  rpcStatus,
  overlayStatus: {
    enabled: true,
    url: "http://127.0.0.1:3030/overlay",
    port: 3030,
    message: { key: "status.overlay.running" },
    updatedAt: "2026-01-15T12:00:00.000Z",
  },
}

const presentation: ValorantPresentation = {
  agentName: "Jett",
  mapName: "Ascent",
  rankName: "Diamond 3",
}

export function installTestFixture() {
  mockWindows("main")
  mockIPC(
    async (command, payload) => {
      if (
        fixture === "startup" &&
        (command === "riot_start_monitor" || command === "settings_initialize")
      ) {
        return new Promise(() => undefined)
      }
      switch (command) {
        case "plugin:app|version":
          return "0.1.6"
        case "settings_initialize":
          return { settings, rpcStatus }
        case "settings_set":
          return {
            settings: (payload as { settings: Settings }).settings,
            rpcStatus,
          }
        case "riot_start_monitor":
          return coreStatus
        case "riot_stop_monitor":
          return { ...coreStatus, monitored: false }
        case "app_get_snapshot":
          return appSnapshot
        case "valorant_get_presentation":
          return presentation
        case "discord_rpc_set_enabled":
          return { ...rpcStatus, enabled: !rpcStatus.enabled }
        case "plugin:updater|check":
          return {
            rid: 1,
            currentVersion: "0.1.6",
            version: "0.2.0",
            date: "2026-01-15 12:00:00 UTC",
            body: "## Highlights\n\n- Faster startup\n- Improved live match details",
            rawJson: {},
          }
        default:
          return null
      }
    },
    { shouldMockEvents: true },
  )
}
