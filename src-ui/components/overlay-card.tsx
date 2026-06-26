import {
  IconBroadcast,
  IconCopy,
  IconExternalLink,
  IconHelpCircle,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Panel } from "@/components/panel"
import type { OverlayStatus } from "@/lib/types"

export function OverlayCard({
  overlay,
  onCopy,
  onOpen,
}: {
  overlay: OverlayStatus
  onCopy: () => void
  onOpen: () => void
}) {
  const url = overlay.url ?? null

  return (
    <Panel
      icon={<IconBroadcast />}
      title="OBS Overlay"
      action={
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground">
              <IconHelpCircle className="size-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Add this URL as a Browser Source in OBS.
          </TooltipContent>
        </Tooltip>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs text-muted-foreground">
              Browser Source URL
            </p>
            <code className="block w-full truncate rounded-md border bg-background/60 px-2.5 py-1.5 font-mono text-xs">
              {url ?? "Overlay not running"}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCopy} disabled={!url}>
              <IconCopy data-icon="inline-start" />
              Copy URL
            </Button>
            <Button variant="outline" onClick={onOpen} disabled={!url}>
              <IconExternalLink data-icon="inline-start" />
              Open
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Suggested Size:{" "}
            <span className="font-mono text-foreground">360 × 90</span>
          </p>
          <p className="text-xs text-muted-foreground">Live Preview</p>
        </div>

        <div className="flex justify-center overflow-hidden rounded-lg border bg-background/60 p-3">
          {url ? (
            <iframe
              title="OBS rank overlay preview"
              src={url}
              className="h-[90px] w-[360px] max-w-full border-0 bg-transparent"
            />
          ) : (
            <div className="flex h-[90px] w-full items-center justify-center gap-2 text-xs text-muted-foreground">
              <IconBroadcast className="size-4" />
              Preview unavailable
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
