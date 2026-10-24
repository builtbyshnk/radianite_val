<script lang="ts">
  import IconClockHour4 from "@solar-icons/svelte/bold/clock-circle"
  import RelativeTime from "@/components/relative-time.svelte"
  import { locale } from "@/lib/locale.svelte"
  import { formatUptime, statusPill } from "@/lib/format"
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
  const tones = {
    ready: "text-success",
    pending: "text-chart-4",
    error: "text-destructive",
    idle: "text-muted-foreground",
  }
  let health = $derived.by(() => {
    void locale.revision
    return statusPill(status.kind)
  })
</script>

<footer
  class="flex min-h-10 shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t bg-background px-4 py-2 text-xs select-none"
>
  <div class="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
    <span class="flex items-center gap-2 font-medium text-foreground">
      <span
        aria-hidden="true"
        class={cn(
          "size-1.5 shrink-0 rounded-full bg-current",
          tones[health.tone],
        )}
      ></span>
      {health.label}
    </span>
    <span class="flex items-center gap-2 text-muted-foreground">
      {locale.t("statusBar.lastSync")}
      <span class="text-foreground tabular-nums">
        <RelativeTime date={lastSync} {now} fallback="—" />
      </span>
    </span>
  </div>
  <span class="flex items-center gap-1.5 text-muted-foreground">
    <IconClockHour4 class="size-3.5" aria-hidden="true" />
    {locale.t("statusBar.uptime")}
    <span class="font-mono tabular-nums">{formatUptime(now - startedAt)}</span>
  </span>
</footer>
