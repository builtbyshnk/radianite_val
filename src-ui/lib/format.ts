import type { CoreStatusKind, LiveSnapshot, MatchPhase } from "@/lib/types"

export type StatusTone = "ready" | "pending" | "error" | "idle"

export function statusPill(kind: CoreStatusKind): {
  label: string
  tone: StatusTone
} {
  switch (kind) {
    case "valorantReady":
      return { label: "VALORANT Ready", tone: "ready" }
    case "valorantLaunching":
      return { label: "VALORANT Launching", tone: "pending" }
    case "riotClientOnly":
      return { label: "Riot Client Only", tone: "pending" }
    case "riotClientClosed":
      return { label: "Riot Client Closed", tone: "idle" }
    case "noRiotInstall":
      return { label: "Riot Not Installed", tone: "error" }
    case "authExpired":
      return { label: "Auth Expired", tone: "error" }
    case "error":
      return { label: "Error", tone: "error" }
    case "degraded":
      return { label: "Degraded", tone: "pending" }
    case "disconnected":
    default:
      return { label: "Disconnected", tone: "idle" }
  }
}

const QUEUE_LABELS: Record<string, string> = {
  competitive: "Competitive",
  unrated: "Unrated",
  swiftplay: "Swiftplay",
  spikerush: "Spike Rush",
  deathmatch: "Deathmatch",
  ggteam: "Escalation",
  hurm: "Team Deathmatch",
  newmap: "New Map",
  onefa: "Replication",
  ggrush: "Escalation",
}

const PHASE_LABELS: Record<MatchPhase, string> = {
  menus: "In Menus",
  matchmaking: "Matchmaking",
  pregame: "Agent Select",
  ingame: "In Game",
  range: "Practice Range",
  unknown: "Unknown",
}

export function phaseLabel(phase: MatchPhase) {
  return PHASE_LABELS[phase] ?? labelize(phase)
}

export function queueLabel(queueId?: string | null) {
  if (!queueId) return null
  return QUEUE_LABELS[queueId.toLowerCase()] ?? labelize(queueId)
}

export function playerName(snapshot: LiveSnapshot | null) {
  const name = snapshot?.player.gameName
  if (!name) return null
  return `${name}${snapshot?.player.gameTag ? `#${snapshot.player.gameTag}` : ""}`
}

export function labelize(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^\w/, (letter) => letter.toUpperCase())
    .trim()
}

export function formatTime(date: Date | null) {
  if (!date) return "--:--"
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function formatUptime(ms: number) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
    .toString()
    .padStart(2, "0")
  const m = Math.floor((total % 3600) / 60)
    .toString()
    .padStart(2, "0")
  const s = (total % 60).toString().padStart(2, "0")
  return `${h}:${m}:${s}`
}

export function formatUpdateDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
