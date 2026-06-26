import {
  IconDownload,
  IconRefresh,
  IconRocket,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Panel } from "@/components/panel"
import { cn } from "@/lib/utils"
import type { UpdaterState } from "@/lib/types"

export function UpdatesCard({
  updater,
  version,
  canInstall,
  onCheck,
  onInstall,
}: {
  updater: UpdaterState
  version: string | null
  canInstall: boolean
  onCheck: () => void
  onInstall: () => void
}) {
  const checking =
    updater.status === "checking" || updater.status === "installing"
  const current = updater.currentVersion ?? version ?? "—"

  return (
    <Panel icon={<IconRocket />} title="App Updates">
      <div className="grid grid-cols-[1fr_auto] items-start gap-4">
        <div className="flex flex-col gap-2.5">
          <div>
            <p className="text-xs text-muted-foreground">Current Version</p>
            <p className="font-mono text-sm font-semibold">v{current}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className={cn("text-sm font-medium", statusTone(updater.status))}>
              {statusLabel(updater)}
            </p>
          </div>
          {updater.status === "installing" ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${updater.progress ?? 35}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={onCheck} disabled={checking}>
            <IconRefresh data-icon="inline-start" />
            Check
          </Button>
          <Button size="sm" onClick={onInstall} disabled={!canInstall || checking}>
            <IconDownload data-icon="inline-start" />
            Install
          </Button>
        </div>
      </div>
    </Panel>
  )
}

function statusLabel(updater: UpdaterState) {
  switch (updater.status) {
    case "current":
      return "Up to date"
    case "available":
      return `v${updater.version} available`
    case "checking":
      return "Checking…"
    case "installing":
      return updater.message
    case "installed":
      return "Installed — relaunching"
    case "error":
      return "Update error"
    default:
      return "Not checked yet"
  }
}

function statusTone(status: UpdaterState["status"]) {
  if (status === "current" || status === "installed") return "text-success"
  if (status === "available") return "text-primary"
  if (status === "error") return "text-destructive"
  return "text-muted-foreground"
}
