import { useEffect, useState } from "react"
import { IconBrandDiscord, IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react"

import { AppIcon } from "@/components/app-icon"
import { Button } from "@/components/ui/button"
import { Panel } from "@/components/panel"
import { agentIconUrl, mapArt } from "@/lib/valorant-assets"
import { rpcPreview, type RpcPreview } from "@/lib/rpc-preview"
import { cn } from "@/lib/utils"
import type { LiveSnapshot, RpcStatus } from "@/lib/types"

export function DiscordCard({
  rpc,
  snapshot,
  busy,
  onToggle,
}: {
  rpc: RpcStatus
  snapshot: LiveSnapshot | null
  busy: boolean
  onToggle: () => void
}) {
  const canToggle = rpc.configured || rpc.enabled
  const preview = rpcPreview(snapshot)

  return (
    <Panel
      icon={<IconBrandDiscord />}
      title="Discord Presence"
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          disabled={busy || !canToggle}
        >
          {rpc.enabled ? (
            <IconPlayerStop data-icon="inline-start" />
          ) : (
            <IconPlayerPlay data-icon="inline-start" />
          )}
          {rpc.enabled ? "Disable" : "Enable"}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              "size-2 rounded-full",
              rpc.connected ? "bg-success" : "bg-muted-foreground",
            )}
          />
          <span
            className={cn(
              "font-medium",
              rpc.connected ? "text-success" : "text-muted-foreground",
            )}
          >
            {rpc.connected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">What your friends see</p>
        {preview ? (
          <DiscordActivity preview={preview} snapshot={snapshot} />
        ) : (
          <div className="rounded-lg border bg-[#1a1b1e] p-3 text-sm text-muted-foreground">
            {canToggle
              ? "No live match — launch VALORANT to share your activity."
              : "Set RADIANITE_DISCORD_APP_ID to enable Rich Presence."}
          </div>
        )}
      </div>
    </Panel>
  )
}

function DiscordActivity({
  preview,
  snapshot,
}: {
  preview: RpcPreview
  snapshot: LiveSnapshot | null
}) {
  const elapsed = useElapsed(preview.startedAt)
  const agentUrl = agentIconUrl(snapshot?.agentId)
  const [largeUrl, setLargeUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function resolveLargeImage() {
      if (!snapshot) {
        if (active) setLargeUrl(null)
        return
      }

      if (snapshot.phase === "pregame") {
        if (active) setLargeUrl(agentUrl)
        return
      }

      if (snapshot.phase === "ingame" || snapshot.phase === "range") {
        const art = await mapArt(snapshot.mapId, snapshot.mapName)
        if (!active) return
        setLargeUrl(art?.listViewIcon ?? agentUrl)
        return
      }

      if (active) setLargeUrl(null)
    }

    void resolveLargeImage()
    return () => {
      active = false
    }
  }, [snapshot, agentUrl])

  return (
    <div className="rounded-lg border border-white/5 bg-[#232428] p-3 text-[#dbdee1]">
      <p className="mb-2 text-[0.65rem] font-bold tracking-wide text-[#b5bac1] uppercase">
        Playing
      </p>
      <div className="flex gap-3">
        <div className="relative size-[52px] shrink-0">
          <div className="flex size-full items-center justify-center overflow-hidden rounded-lg bg-[#1a1b1e]">
            {largeUrl ? (
              <img src={largeUrl} alt="" className="size-full object-cover" />
            ) : (
              <AppIcon className="size-9 rounded-md" />
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center overflow-hidden rounded-full bg-[#232428] ring-2 ring-[#232428]">
            {agentUrl ? (
              <img
                src={agentUrl}
                alt=""
                className="size-4 rounded-full object-cover"
              />
            ) : null}
          </span>
        </div>

        <div className="min-w-0 flex-1 text-sm leading-tight">
          <p className="truncate font-semibold text-white">{preview.name}</p>
          <p className="truncate text-[0.7rem] text-[#b5bac1]">{preview.details}</p>
          <p className="truncate text-[0.7rem] text-[#b5bac1]">{preview.state}</p>
          {elapsed ? (
            <p className="mt-0.5 truncate text-[0.8rem] text-[#b5bac1]">
              {elapsed} elapsed
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt == null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [startedAt])

  if (startedAt == null) return null
  const total = Math.max(0, Math.floor((now - startedAt) / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }
  return `${m}:${s.toString().padStart(2, "0")}`
}
