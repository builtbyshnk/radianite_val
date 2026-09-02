<script lang="ts">
  import { onMount } from "svelte"
  import { getCurrentWindow } from "@tauri-apps/api/window"
  import { listen } from "@tauri-apps/api/event"
  import IconCopy from "lucide-svelte/icons/copy"
  import IconMinus from "lucide-svelte/icons/minus"
  import IconPlayerPlay from "lucide-svelte/icons/play"
  import IconPlayerStop from "lucide-svelte/icons/circle-stop"
  import IconRefresh from "lucide-svelte/icons/refresh-cw"
  import IconSettings from "lucide-svelte/icons/settings"
  import IconSquare from "lucide-svelte/icons/square"
  import IconX from "lucide-svelte/icons/x"
  import AppIcon from "@/components/app-icon.svelte"
  import { Button } from "@/components/ui/button"
  import * as Tooltip from "@/components/ui/tooltip"
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
  let isMaximized = $state(false)

  onMount(() => {
    if (!appWindow) return
    let unlisten: (() => void) | undefined
    void appWindow.isMaximized().then((max) => {
      isMaximized = max
    })
    void listen("tauri://resize", async () => {
      if (appWindow) {
        isMaximized = await appWindow.isMaximized()
      }
    }).then((fn) => {
      unlisten = fn
    })
    return () => {
      unlisten?.()
    }
  })

  const tones = {
    ready: "border-success/30 bg-success/10 text-success",
    pending: "border-chart-4/30 bg-chart-4/10 text-chart-4",
    error: "border-destructive/30 bg-destructive/15 text-destructive",
    idle: "border-border bg-muted/40 text-muted-foreground",
  }
  let pill = $derived(statusPill(status.kind))
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<header
  data-tauri-drag-region
  ondblclick={(e) => {
    if (
      (e.target as HTMLElement)?.closest(
        "button, a, [data-tauri-drag-region='false']",
      )
    )
      return
    void appWindow?.toggleMaximize()
  }}
  class="flex h-12 shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-3 backdrop-blur select-none"
>
  <div data-tauri-drag-region class="flex min-w-0 items-center gap-3">
    <AppIcon class="size-5 rounded-sm" /><span
      class="truncate text-sm font-semibold tracking-wide">Radianite</span
    ><span class="font-mono text-xs text-muted-foreground"
      >v{version ?? "—"}</span
    ><span
      class={cn(
        "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:flex",
        tones[pill.tone],
      )}
      ><span class="size-1.5 rounded-full bg-current"></span>{pill.label}</span
    >
  </div>
  <div class="flex items-center gap-2">
    <Tooltip.Root
      ><Tooltip.Trigger
        >{#snippet child({ props })}<Button
            {...props}
            size="icon-sm"
            variant="ghost"
            onclick={onOpenSettings}
            aria-label={locale.t("titleBar.openSettings")}
            class="size-8 hover:translate-y-0"
            ><IconSettings
              data-motion
              class="transition-transform duration-300 ease-out group-hover/button:rotate-45"
            /></Button
          >{/snippet}</Tooltip.Trigger
      ><Tooltip.Content>{locale.t("titleBar.openSettings")}</Tooltip.Content
      ></Tooltip.Root
    >
    <Tooltip.Root
      ><Tooltip.Trigger
        >{#snippet child({ props })}<Button
            {...props}
            size="sm"
            variant="outline"
            onclick={onRefresh}
            disabled={busy}
            aria-label={locale.t("titleBar.refresh")}
            class="h-8"
            ><IconRefresh
              data-motion
              data-icon="inline-start"
              class="transition-transform duration-300 ease-out group-hover/button:rotate-180"
            /><span class="hidden sm:inline"
              >{locale.t("titleBar.refresh")}</span
            ></Button
          >{/snippet}</Tooltip.Trigger
      ><Tooltip.Content>{locale.t("titleBar.refresh")}</Tooltip.Content
      ></Tooltip.Root
    >
    {#if status.monitored}<Tooltip.Root
        ><Tooltip.Trigger
          >{#snippet child({ props })}<Button
              {...props}
              size="sm"
              onclick={onStopMonitor}
              disabled={busy}
              aria-label={locale.t("titleBar.stopMonitoring")}
              class="h-8 bg-primary text-primary-foreground hover:bg-primary/85"
              ><IconPlayerStop
                data-motion
                data-icon="inline-start"
                class="transition-transform duration-150 group-hover/button:scale-110"
              /><span class="hidden sm:inline"
                >{locale.t("titleBar.stopMonitoring")}</span
              ></Button
            >{/snippet}</Tooltip.Trigger
        ><Tooltip.Content>{locale.t("titleBar.stopMonitoring")}</Tooltip.Content
        ></Tooltip.Root
      >{:else}<Tooltip.Root
        ><Tooltip.Trigger
          >{#snippet child({ props })}<Button
              {...props}
              size="sm"
              onclick={onStartMonitor}
              disabled={busy}
              aria-label={locale.t("titleBar.startMonitoring")}
              class="h-8"
              ><IconPlayerPlay
                data-motion
                data-icon="inline-start"
                class="transition-transform duration-150 group-hover/button:scale-110"
              /><span class="hidden sm:inline"
                >{locale.t("titleBar.startMonitoring")}</span
              ></Button
            >{/snippet}</Tooltip.Trigger
        ><Tooltip.Content
          >{locale.t("titleBar.startMonitoring")}</Tooltip.Content
        ></Tooltip.Root
      >{/if}
    <div class="ms-1 flex items-center" data-tauri-drag-region="false">
      <Tooltip.Root
        ><Tooltip.Trigger
          >{#snippet child({ props })}<button
              {...props}
              type="button"
              aria-label={locale.t("titleBar.minimize")}
              onclick={() => appWindow?.minimize()}
              class="flex h-8 w-10 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              ><IconMinus class="size-4" /></button
            >{/snippet}</Tooltip.Trigger
        ><Tooltip.Content>{locale.t("titleBar.minimize")}</Tooltip.Content
        ></Tooltip.Root
      >
      <Tooltip.Root
        ><Tooltip.Trigger
          >{#snippet child({ props })}<button
              {...props}
              type="button"
              aria-label={isMaximized
                ? locale.t("titleBar.restore", { defaultValue: "Restore" })
                : locale.t("titleBar.maximize")}
              onclick={() => appWindow?.toggleMaximize()}
              class="flex h-8 w-10 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >{#if isMaximized}<IconCopy class="size-3.5" />{:else}<IconSquare
                  class="size-3.5"
                />{/if}</button
            >{/snippet}</Tooltip.Trigger
        ><Tooltip.Content
          >{isMaximized
            ? locale.t("titleBar.restore", { defaultValue: "Restore" })
            : locale.t("titleBar.maximize")}</Tooltip.Content
        ></Tooltip.Root
      >
      <Tooltip.Root
        ><Tooltip.Trigger
          >{#snippet child({ props })}<button
              {...props}
              type="button"
              aria-label={locale.t("titleBar.close")}
              onclick={() => appWindow?.close()}
              class="flex h-8 w-10 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-[#c42b1c] hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
              ><IconX class="size-4" /></button
            >{/snippet}</Tooltip.Trigger
        ><Tooltip.Content>{locale.t("titleBar.close")}</Tooltip.Content
        ></Tooltip.Root
      >
    </div>
  </div>
</header>
