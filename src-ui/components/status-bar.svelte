<script lang="ts">
  import IconClockHour4 from "lucide-svelte/icons/clock-4"
  import IconRefreshDot from "lucide-svelte/icons/refresh-cw"
  import IconWifi from "lucide-svelte/icons/wifi"
  import RelativeTime from "@/components/relative-time.svelte"
  import { locale } from "@/lib/locale.svelte"
  import { formatUptime } from "@/lib/format"
  import { cn } from "@/lib/utils"
  import type { CoreStatus } from "@/lib/types"
  let {
    status,
    lastSync,
    startedAt,
    now,
  }: {
    status: CoreStatus
    lastSync: Date | null
    startedAt: number
    now: number
  } = $props()
  let health = $derived(
    status.kind === "valorantReady"
      ? { label: locale.t("statusBar.excellent"), tone: "text-success" }
      : status.kind === "riotClientOnly" ||
          status.kind === "valorantLaunching" ||
          status.kind === "degraded"
        ? {
            label: locale.t(
              status.kind === "degraded"
                ? "statusBar.degraded"
                : "statusBar.good",
            ),
            tone: "text-chart-4",
          }
        : status.kind === "error" ||
            status.kind === "noRiotInstall" ||
            status.kind === "authExpired"
          ? { label: locale.t("statusBar.error"), tone: "text-destructive" }
          : {
              label: locale.t("statusBar.offline"),
              tone: "text-muted-foreground",
            },
  )
</script>

<footer
  class="flex h-11 shrink-0 items-center border-t bg-background/80 px-4 text-xs backdrop-blur"
>
  <div class="flex items-center gap-4 text-muted-foreground">
    <span class="flex items-center gap-1.5"
      ><IconWifi class={cn("size-4", health.tone)} />{locale.t(
        "statusBar.connectionHealth",
      )}
      <strong class={cn("font-semibold", health.tone)}>{health.label}</strong
      ></span
    ><span class="h-4 w-px bg-border"></span><span
      class="flex items-center gap-1.5"
      ><IconRefreshDot class="size-4" />{locale.t("statusBar.lastSync")}
      <strong class="font-mono font-normal text-foreground"
        ><RelativeTime date={lastSync} {now} fallback="--:--" /></strong
      ></span
    ><span class="h-4 w-px bg-border"></span><span
      class="flex items-center gap-1.5"
      ><IconClockHour4 class="size-4" />{locale.t("statusBar.uptime")}
      <strong class="font-mono font-normal text-foreground"
        >{formatUptime(now - startedAt)}</strong
      ></span
    >
  </div>
</footer>
