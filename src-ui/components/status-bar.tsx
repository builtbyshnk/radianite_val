import {
  IconClockHour4,
  IconFileText,
  IconRefreshDot,
  IconWifi,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatTime, formatUptime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CoreStatus } from "@/lib/types"

function connectionHealth(status: CoreStatus): {
  label: string
  tone: string
} {
  switch (status.kind) {
    case "valorantReady":
      return { label: "Excellent", tone: "text-success" }
    case "riotClientOnly":
    case "valorantLaunching":
      return { label: "Good", tone: "text-chart-4" }
    case "degraded":
      return { label: "Degraded", tone: "text-chart-4" }
    case "error":
    case "authExpired":
    case "noRiotInstall":
      return { label: "Error", tone: "text-destructive" }
    default:
      return { label: "Offline", tone: "text-muted-foreground" }
  }
}

export function StatusBar({
  status,
  lastSync,
  uptimeMs,
}: {
  status: CoreStatus
  lastSync: Date | null
  uptimeMs: number
}) {
  const health = connectionHealth(status)

  return (
    <footer className="flex h-11 shrink-0 items-center justify-between gap-4 border-t bg-background/80 px-4 text-xs backdrop-blur">
      <div className="flex items-center gap-4 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <IconWifi className={cn("size-4", health.tone)} />
          Connection Health
          <span className={cn("font-semibold", health.tone)}>
            {health.label}
          </span>
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span className="flex items-center gap-1.5">
          <IconRefreshDot className="size-4" />
          Last Sync
          <span className="font-mono text-foreground">
            {formatTime(lastSync)}
          </span>
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span className="flex items-center gap-1.5">
          <IconClockHour4 className="size-4" />
          Uptime
          <span className="font-mono text-foreground">
            {formatUptime(uptimeMs)}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info("Log viewer is coming soon")}
        >
          <IconFileText data-icon="inline-start" />
          Logs
        </Button>
      </div>
    </footer>
  )
}
