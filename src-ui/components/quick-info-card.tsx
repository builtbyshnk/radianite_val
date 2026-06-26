import {
  IconBrandDiscord,
  IconBroadcast,
  IconClockHour4,
  IconInfoCircle,
  IconTargetArrow,
} from "@tabler/icons-react"

import { Panel } from "@/components/panel"
import { formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { LiveSnapshot, OverlayStatus, RpcStatus } from "@/lib/types"

const LIVE_PHASES = new Set(["pregame", "ingame", "range"])

export function QuickInfoCard({
  overlay,
  rpc,
  snapshot,
  lastSync,
}: {
  overlay: OverlayStatus
  rpc: RpcStatus
  snapshot: LiveSnapshot | null
  lastSync: Date | null
}) {
  const tracking = snapshot ? LIVE_PHASES.has(snapshot.phase) : false

  const rows = [
    {
      icon: <IconBroadcast />,
      label: "Overlay",
      value: overlay.enabled ? "Ready" : "Off",
      good: overlay.enabled,
    },
    {
      icon: <IconBrandDiscord />,
      label: "Discord Rich Presence",
      value: rpc.connected ? "Ready" : rpc.enabled ? "Connecting" : "Off",
      good: rpc.connected,
    },
    {
      icon: <IconTargetArrow />,
      label: "Match Tracking",
      value: tracking ? "Active" : "Idle",
      good: tracking,
    },
    {
      icon: <IconClockHour4 />,
      label: "Last Sync",
      value: formatTime(lastSync),
      good: undefined,
    },
  ]

  return (
    <Panel icon={<IconInfoCircle />} title="Quick Info">
      <div className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 border-t border-border/60 py-2 first:border-t-0"
          >
            <span className="flex items-center gap-2.5 text-sm text-muted-foreground [&_svg]:size-4">
              {row.icon}
              <span className="text-foreground">{row.label}</span>
            </span>
            <span
              className={cn(
                "text-sm font-semibold",
                row.good === true && "text-success",
                row.good === false && "text-muted-foreground",
                row.good === undefined && "font-mono text-foreground",
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}
