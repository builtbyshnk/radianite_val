<script lang="ts">
  import { getCurrentWindow } from "@tauri-apps/api/window"
  import { IconMinus, IconPlayerPlay, IconPlayerStop, IconRefresh, IconSettings, IconSquare, IconX } from "@tabler/icons-svelte"
  import AppIcon from "@/components/app-icon.svelte"
  import { Button } from "@/components/ui/button"
  import { statusPill } from "@/lib/format"
  import { locale } from "@/lib/locale.svelte"
  import { cn } from "@/lib/utils"
  import type { CoreStatus } from "@/lib/types"
  let { status, version, busy, onRefresh, onStartMonitor, onStopMonitor, onOpenSettings }: { status: CoreStatus; version: string | null; busy: boolean; onRefresh: () => void; onStartMonitor: () => void; onStopMonitor: () => void; onOpenSettings: () => void } = $props()
  const appWindow = "__TAURI_INTERNALS__" in window ? getCurrentWindow() : null
  const tones = { ready: "border-success/30 bg-success/10 text-success", pending: "border-chart-4/30 bg-chart-4/10 text-chart-4", error: "border-destructive/30 bg-destructive/15 text-destructive", idle: "border-border bg-muted/40 text-muted-foreground" }
  let pill = $derived(statusPill(status.kind))
</script>
<header data-tauri-drag-region class="flex h-12 shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-3 backdrop-blur">
  <div data-tauri-drag-region class="flex items-center gap-3"><AppIcon class="size-5 rounded-sm" /><span class="text-sm font-semibold tracking-wide">Radianite</span><span class="font-mono text-xs text-muted-foreground">v{version ?? "—"}</span><span class={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", tones[pill.tone])}><span class="size-1.5 rounded-full bg-current"></span>{pill.label}</span></div>
  <div class="flex items-center gap-2">
    <Button size="icon-sm" variant="ghost" onclick={onOpenSettings} aria-label={locale.t("titleBar.openSettings")} title={locale.t("titleBar.openSettings")} class="size-8"><IconSettings /></Button>
    <Button size="sm" variant="outline" onclick={onRefresh} disabled={busy} class="h-8"><IconRefresh data-icon="inline-start" />{locale.t("titleBar.refresh")}</Button>
    {#if status.monitored}<Button size="sm" onclick={onStopMonitor} disabled={busy} class="h-8 bg-primary text-primary-foreground hover:bg-primary/85"><IconPlayerStop data-icon="inline-start" />{locale.t("titleBar.stopMonitoring")}</Button>{:else}<Button size="sm" onclick={onStartMonitor} disabled={busy} class="h-8"><IconPlayerPlay data-icon="inline-start" />{locale.t("titleBar.startMonitoring")}</Button>{/if}
    <div class="ms-1 flex items-center">
      <button type="button" aria-label={locale.t("titleBar.minimize")} title={locale.t("titleBar.minimize")} onclick={() => appWindow?.minimize()} class="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><IconMinus class="size-4" /></button>
      <button type="button" aria-label={locale.t("titleBar.maximize")} title={locale.t("titleBar.maximize")} onclick={() => appWindow?.toggleMaximize()} class="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><IconSquare class="size-3.5" /></button>
      <button type="button" aria-label={locale.t("titleBar.close")} title={locale.t("titleBar.close")} onclick={() => appWindow?.close()} class="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-ring"><IconX class="size-4" /></button>
    </div>
  </div>
</header>
