import {
  IconBroadcast,
  IconCopy,
  IconExternalLink,
  IconHelpCircle,
} from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()
  const url = overlay.url ?? null

  return (
    <Panel
      icon={<IconBroadcast />}
      title={t("overlay.title")}
      action={
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground">
              <IconHelpCircle className="size-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {t("overlay.help")}
          </TooltipContent>
        </Tooltip>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs text-muted-foreground">
              {t("overlay.sourceUrl")}
            </p>
            <code className="block w-full truncate rounded-md border bg-background/60 px-2.5 py-1.5 font-mono text-xs">
              {url ?? t("overlay.notRunning")}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCopy} disabled={!url}>
              <IconCopy data-icon="inline-start" />
              {t("overlay.copyUrl")}
            </Button>
            <Button variant="outline" onClick={onOpen} disabled={!url}>
              <IconExternalLink data-icon="inline-start" />
              {t("common.open")}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {t("overlay.suggestedSize")}{" "}
            <span className="font-mono text-foreground">360 × 90</span>
          </p>
          <p className="text-xs text-muted-foreground">{t("overlay.livePreview")}</p>
        </div>

        <div className="flex justify-center overflow-hidden rounded-lg border bg-background/60 p-3">
          {url ? (
            <iframe
              title={t("overlay.previewTitle")}
              src={url}
              className="h-[90px] w-[360px] max-w-full border-0 bg-transparent"
            />
          ) : (
            <div className="flex h-[90px] w-full items-center justify-center gap-2 text-xs text-muted-foreground">
              <IconBroadcast className="size-4" />
              {t("overlay.previewUnavailable")}
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
