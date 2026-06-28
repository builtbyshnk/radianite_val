import type { LiveSnapshot } from "@/lib/types"

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

type LocalizedContent = {
  agents: Map<string, string>
  maps: Map<string, string>
  tiers: Map<number, string>
}

export type LocalizedGameNames = {
  agentName: string | null
  mapName: string | null
  rankName: string | null
}

const localizedContentCache = new Map<string, Promise<LocalizedContent>>()

async function loadLocalizedContent(locale: string): Promise<LocalizedContent> {
  const result: LocalizedContent = { agents: new Map(), maps: new Map(), tiers: new Map() }
  try {
    const [agentsResponse, mapsResponse, tiersResponse] = await Promise.all([
      fetch(`${API}/agents?isPlayableCharacter=true&language=${encodeURIComponent(locale)}`),
      fetch(`${API}/maps?language=${encodeURIComponent(locale)}`),
      fetch(`${API}/competitivetiers?language=${encodeURIComponent(locale)}`),
    ])
    const [agentsJson, mapsJson, tiersJson] = await Promise.all([
      agentsResponse.json() as Promise<{ data?: Array<{ uuid?: string; displayName?: string }> }>,
      mapsResponse.json() as Promise<{ data?: MapEntry[] }>,
      tiersResponse.json() as Promise<{ data?: Array<{ tiers?: Array<TierEntry & { tierName?: string }> }> }>,
    ])
    for (const agent of agentsJson.data ?? []) {
      if (agent.uuid && agent.displayName) result.agents.set(agent.uuid.toLowerCase(), agent.displayName)
    }
    for (const map of mapsJson.data ?? []) {
      if (map.mapUrl && map.displayName) result.maps.set(map.mapUrl.toLowerCase(), map.displayName)
    }
    const tierSet = tiersJson.data?.[Math.max(0, (tiersJson.data?.length ?? 1) - 1)]
    for (const tier of tierSet?.tiers ?? []) {
      if (typeof tier.tier === "number" && tier.tierName) result.tiers.set(tier.tier, tier.tierName)
    }
  } catch {
    // The caller falls back to the English names already present in the snapshot.
  }
  return result
}

export async function localizedGameNames(snapshot: LiveSnapshot, locale: string): Promise<LocalizedGameNames> {
  let content = localizedContentCache.get(locale)
  if (!content) {
    content = loadLocalizedContent(locale)
    localizedContentCache.set(locale, content)
  }
  const resolved = await content
  return {
    agentName: snapshot.agentId ? resolved.agents.get(snapshot.agentId.toLowerCase()) ?? null : null,
    mapName: snapshot.mapId ? resolved.maps.get(snapshot.mapId.toLowerCase()) ?? null : null,
    rankName: typeof snapshot.rank?.tier === "number" ? resolved.tiers.get(snapshot.rank.tier) ?? null : null,
  }
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
