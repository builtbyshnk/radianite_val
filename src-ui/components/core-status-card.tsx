import { IconActivity, IconCircleCheck, IconCircleX } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import { Panel } from "@/components/panel"
import { cn } from "@/lib/utils"
import type { DiagnosticSnapshot } from "@/lib/types"

export function CoreStatusCard({
  diagnostics,
}: {
  diagnostics: DiagnosticSnapshot
}) {
  const { t } = useTranslation()
  const rows = [
    { label: t("core.riotConnected"), ready: diagnostics.localApiReady },
    { label: t("core.valorantRunning"), ready: diagnostics.valorantSessionPresent },
    {
      label: t("core.accountReady"),
      ready:
        diagnostics.accessTokenReady && diagnostics.entitlementTokenReady,
    },
  ]

  return (
    <Panel icon={<IconActivity />} title={t("core.title")}>
      <div className="flex flex-col">
        {rows.map((row) => (
          <StatusRow key={row.label} label={row.label} ready={row.ready} />
        ))}
      </div>
    </Panel>
  )
}

function StatusRow({ label, ready }: { label: string; ready: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/60 py-2 first:border-t-0">
      <span className="flex items-center gap-2.5 text-sm">
        {ready ? (
          <IconCircleCheck className="size-4.5 text-success" />
        ) : (
          <IconCircleX className="size-4.5 text-muted-foreground" />
        )}
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold",
          ready ? "text-success" : "text-muted-foreground",
        )}
      >
        {ready ? t("common.ready") : t("common.notReady")}
      </span>
    </div>
  )
}
