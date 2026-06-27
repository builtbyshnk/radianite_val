import {
  IconCalendarEvent,
  IconClockCheck,
  IconDownload,
  IconRefresh,
  IconRocket,
  IconShieldCheck,
  IconSparkles,
  IconTag,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Panel } from "@/components/panel"
import { formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { UpdaterState } from "@/lib/types"

export function UpdatesCard({
  updater,
  version,
  canInstall,
  lastChecked,
  onCheck,
  onInstall,
}: {
  updater: UpdaterState
  version: string | null
  canInstall: boolean
  lastChecked: Date | null
  onCheck: () => void
  onInstall: () => void
}) {
  const checking =
    updater.status === "checking" || updater.status === "installing"
  const current = updater.currentVersion ?? version ?? "—"
  const hasUpdate = updater.status === "available" && Boolean(updater.version)
  const releaseNotes = hasUpdate ? cleanNotes(updater.body) : null

  return (
    <Panel icon={<IconRocket />} title="App Updates">
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col">
          <InfoRow
            icon={<IconTag />}
            label="Current Version"
            value={`v${current}`}
            mono
          />
          <InfoRow
            icon={<IconRocket />}
            label="Status"
            value={statusLabel(updater)}
            valueClassName={statusTone(updater.status)}
          />
          <InfoRow
            icon={<IconClockCheck />}
            label="Last Checked"
            value={lastChecked ? formatTime(lastChecked) : "Never"}
            mono
          />
          {hasUpdate ? (
            <InfoRow
              icon={<IconSparkles />}
              label="Latest Version"
              value={`v${updater.version}`}
              valueClassName="text-primary"
              mono
            />
          ) : null}
          {hasUpdate && updater.date ? (
            <InfoRow
              icon={<IconCalendarEvent />}
              label="Released"
              value={formatReleaseDate(updater.date)}
              mono
            />
          ) : null}
        </div>

        {updater.status === "installing" ? (
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${updater.progress ?? 35}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{updater.message}</p>
          </div>
        ) : (
          <p
            className={cn(
              "text-xs",
              updater.status === "error"
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {updater.message}
          </p>
        )}

        {releaseNotes ? (
          <div className="rounded-lg border bg-background/40 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <IconSparkles className="size-3.5 text-primary" />
              What's new
            </p>
            <p className="line-clamp-3 text-xs whitespace-pre-line text-muted-foreground">
              {releaseNotes}
            </p>
          </div>
        ) : null}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconShieldCheck className="size-3.5 text-success" />
          Updates are cryptographically signed and verified.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCheck}
            disabled={checking}
          >
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

function InfoRow({
  icon,
  label,
  value,
  mono,
  valueClassName,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/60 py-1.5 first:border-t-0">
      <span className="flex items-center gap-2.5 text-sm text-muted-foreground [&_svg]:size-4">
        {icon}
        <span className="text-foreground">{label}</span>
      </span>
      <span
        className={cn(
          "text-sm font-semibold",
          mono && "font-mono",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  )
}

function cleanNotes(body?: string | null) {
  const trimmed = body?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : null
}

function formatReleaseDate(date: string) {
  const parsed = new Date(date.replace(/ \d{2}:\d{2}:\d{2}.*$/, ""))
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
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
