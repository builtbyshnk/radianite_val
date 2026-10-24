<script lang="ts">
  import { getCurrentWindow } from "@tauri-apps/api/window"
  import IconMinus from "@solar-icons/svelte/linear/minus"
  import IconPlayerPlay from "@solar-icons/svelte/bold/play"
  import IconPlayerStop from "@solar-icons/svelte/bold/stop-circle"
  import IconRefresh from "@solar-icons/svelte/bold/refresh"
  import IconSettings from "@solar-icons/svelte/bold/settings"
  import IconX from "@solar-icons/svelte/linear/close"
  import AppIcon from "@/components/app-icon.svelte"
  import { Button } from "@/components/ui/button"
  import { statusPill } from "@/lib/format"
  import { locale } from "@/lib/locale.svelte"
  import { cn } from "@/lib/utils"
  import type { CoreStatus } from "@/lib/types"
  let {
    status,
    version,
    busy,
    onRefresh,
    onStartMonitor,
    onStopMonitor,
    onOpenSettings,
  }: {
    status: CoreStatus
    version: string | null
    busy: boolean
    onRefresh: () => void
    onStartMonitor: () => void
    onStopMonitor: () => void
    onOpenSettings: () => void
  } = $props()
  const appWindow = "__TAURI_INTERNALS__" in window ? getCurrentWindow() : null
  const tones = {
    ready: "text-success",
    pending: "text-chart-4",
    error: "text-destructive",
    idle: "text-muted-foreground",
  }
  let pill = $derived(statusPill(status.kind))
</script>

<header
  data-tauri-drag-region
  class="flex h-12 shrink-0 items-center justify-between gap-3 border-b bg-background px-3 select-none"
>
  <div data-tauri-drag-region class="flex min-w-0 items-center gap-3">
    <AppIcon class="size-5 rounded-sm" />
    <span class="truncate text-sm font-semibold">Radianite</span>
    <span class="font-mono text-xs text-muted-foreground"
      >v{version ?? "—"}</span
    >
    <span
      class={cn(
        "flex items-center gap-1.5 text-xs font-medium",
        tones[pill.tone],
      )}
    >
      <span class="size-1.5 rounded-full bg-current"></span>{pill.label}
    </span>
  </div>
  <div class="flex items-center gap-2">
    <Button
      size="icon-sm"
      variant="ghost"
      onclick={onOpenSettings}
      aria-label={locale.t("titleBar.openSettings")}
      title={locale.t("titleBar.openSettings")}
    >
      <IconSettings />
    </Button>
    <Button size="sm" variant="outline" onclick={onRefresh} disabled={busy}>
      <IconRefresh
        data-icon="inline-start"
        class={busy ? "animate-spin" : undefined}
      />
      {locale.t("titleBar.refresh")}
    </Button>
    {#if status.monitored}
      <Button
        size="sm"
        variant="secondary"
        onclick={onStopMonitor}
        disabled={busy}
      >
        <IconPlayerStop data-icon="inline-start" />{locale.t(
          "titleBar.stopMonitoring",
        )}
      </Button>
    {:else}
      <Button size="sm" onclick={onStartMonitor} disabled={busy}>
        <IconPlayerPlay data-icon="inline-start" />{locale.t(
          "titleBar.startMonitoring",
        )}
      </Button>
    {/if}
    <div
      class="ms-2 flex items-center border-s ps-2"
      data-tauri-drag-region="false"
    >
      <button
        type="button"
        aria-label={locale.t("titleBar.minimize")}
        onclick={() => appWindow?.minimize()}
        class="flex h-8 w-9 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconMinus class="size-4" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        aria-label={locale.t("titleBar.close")}
        onclick={() => appWindow?.close()}
        class="flex h-8 w-9 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-[#c42b1c] hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconX class="size-4" strokeWidth={2.5} />
      </button>
    </div>
  </div>
</header>
