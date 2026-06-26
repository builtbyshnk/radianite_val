const API = "https://valorant-api.com/v1"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function agentPortraitUrl(agentId?: string | null): string | null {
  if (!agentId || !UUID_RE.test(agentId)) return null
  return `https://media.valorant-api.com/agents/${agentId.toLowerCase()}/fullportrait.png`
}

export function agentIconUrl(agentId?: string | null): string | null {
  if (!agentId || !UUID_RE.test(agentId)) return null
  return `https://media.valorant-api.com/agents/${agentId.toLowerCase()}/displayicon.png`
}

let mapCache: Promise<Map<string, MapArt>> | null = null
let tierCache: Promise<Map<number, string>> | null = null

type MapArt = { splash: string | null; listViewIcon: string | null }

type MapEntry = {
  mapUrl?: string | null
  displayName?: string | null
  splash?: string | null
  listViewIcon?: string | null
}

type TierEntry = {
  tier?: number | null
  largeIcon?: string | null
}

type TierTable = {
  tiers?: TierEntry[] | null
}

async function loadMaps(): Promise<Map<string, MapArt>> {
  const out = new Map<string, MapArt>()
  try {
    const res = await fetch(`${API}/maps`)
    const json = (await res.json()) as { data?: MapEntry[] | null }
    for (const entry of json.data ?? []) {
      const art: MapArt = {
        splash: entry.splash ?? null,
        listViewIcon: entry.listViewIcon ?? null,
      }
      if (entry.mapUrl) out.set(entry.mapUrl.toLowerCase(), art)
      if (entry.displayName) out.set(`name:${entry.displayName.toLowerCase()}`, art)
    }
  } catch {
    // Offline or unreachable: callers fall back to gradient placeholders.
  }
  return out
}

async function loadTiers(): Promise<Map<number, string>> {
  const out = new Map<number, string>()
  try {
    const res = await fetch(`${API}/competitivetiers`)
    const json = (await res.json()) as { data?: TierTable[] | null }
    // The last table is the current episode's full tier set.
    const table = json.data?.[json.data.length - 1]
    for (const tier of table?.tiers ?? []) {
      if (typeof tier.tier === "number" && tier.largeIcon) {
        out.set(tier.tier, tier.largeIcon)
      }
    }
  } catch {
    // Offline or unreachable: callers fall back to gradient placeholders.
  }
  return out
}

export async function mapArt(
  mapId?: string | null,
  mapName?: string | null,
): Promise<MapArt | null> {
  if (!mapId && !mapName) return null
  mapCache ??= loadMaps()
  const maps = await mapCache
  if (mapId) {
    const byUrl = maps.get(mapId.toLowerCase())
    if (byUrl) return byUrl
  }
  if (mapName) {
    const byName = maps.get(`name:${mapName.toLowerCase()}`)
    if (byName) return byName
  }
  return null
}

export async function rankIconUrl(
  tier?: number | null,
  fallback?: string | null,
): Promise<string | null> {
  if (fallback) return fallback
  if (typeof tier !== "number") return null
  tierCache ??= loadTiers()
  const tiers = await tierCache
  return tiers.get(tier) ?? null
}
