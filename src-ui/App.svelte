<script lang="ts">
  import { onMount } from "svelte"
  import { Toaster } from "@/components/ui/sonner"
  import CoreStatusCard from "@/components/core-status-card.svelte"
  import DiscordCard from "@/components/discord-card.svelte"
  import LiveMatchHero from "@/components/live-match-hero.svelte"
  import OverlayCard from "@/components/overlay-card.svelte"
  import QuickInfoCard from "@/components/quick-info-card.svelte"
  import StartupVeil from "@/components/startup-veil.svelte"
  import StatusBar from "@/components/status-bar.svelte"
  import TitleBar from "@/components/title-bar.svelte"
  import UpdatesCard from "@/components/updates-card.svelte"
  import { localeInfo } from "@/lib/i18n"
  import { RadianiteController } from "@/lib/radianite-controller.svelte"
  const r = new RadianiteController()
  let settingsOpen = $state(false), SettingsDialog = $state<any>(null)
  async function openSettings() { SettingsDialog = (await import("@/components/settings-dialog.svelte")).default; settingsOpen = true }
  onMount(() => { void r.initialize(); if (!import.meta.env.PROD) return () => r.destroy(); document.documentElement.dataset.appHardened = "true"; const blockMenu = (e: Event) => e.preventDefault(); const blockSelect = (e: Event) => { const target = e.target; if (!(target instanceof HTMLElement) || (!target.isContentEditable && !target.closest("input,textarea,select,[contenteditable='true']"))) e.preventDefault() }; const blockKeys = (e: KeyboardEvent) => { const key = e.key.toLowerCase(), modifier = e.ctrlKey || e.metaKey; if (e.key === "F5" || e.key === "F12" || (modifier && key === "r") || (modifier && key === "u") || (modifier && e.shiftKey && ["c", "i", "j"].includes(key))) { e.preventDefault(); e.stopPropagation() } }; window.addEventListener("contextmenu", blockMenu); window.addEventListener("dragstart", blockMenu); window.addEventListener("selectstart", blockSelect); window.addEventListener("keydown", blockKeys, true); return () => { r.destroy(); delete document.documentElement.dataset.appHardened; window.removeEventListener("contextmenu", blockMenu); window.removeEventListener("dragstart", blockMenu); window.removeEventListener("selectstart", blockSelect); window.removeEventListener("keydown", blockKeys, true) } })
</script>
<div class="app-enter flex h-screen flex-col bg-background text-foreground">
  {#if !r.initializing}<TitleBar status={r.diagnostics.status} version={r.appVersion} busy={r.busy} onRefresh={r.refreshAll} onStartMonitor={r.startMonitor} onStopMonitor={r.stopMonitor} onOpenSettings={openSettings} />
  <main class="flex-1 overflow-y-auto p-3"><div class="mx-auto flex w-full max-w-[1400px] flex-col gap-3"><div class="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(22rem,1fr)]"><LiveMatchHero snapshot={r.snapshot} presentation={r.presentation} /><div class="flex flex-col gap-3"><CoreStatusCard diagnostics={r.diagnostics} /><OverlayCard overlay={r.overlayStatus} onCopy={() => r.copyOverlayUrl()} onOpen={() => r.openOverlayUrl()} /></div></div><div class="grid gap-3 lg:grid-cols-3"><DiscordCard rpc={r.rpcStatus} snapshot={r.snapshot} presentation={r.presentation} busy={r.busy} onToggle={r.toggleRpc} now={r.now} /><UpdatesCard updater={r.updater} version={r.appVersion} canInstall={Boolean(r.availableUpdate)} lastChecked={r.lastChecked} now={r.now} onCheck={() => r.checkForUpdate()} onInstall={() => r.installAvailableUpdate()} /><QuickInfoCard overlay={r.overlayStatus} rpc={r.rpcStatus} snapshot={r.snapshot} lastSync={r.lastSync} now={r.now} /></div></div></main>
  <StatusBar status={r.diagnostics.status} lastSync={r.lastSync} startedAt={r.startedAt} now={r.now} />{/if}
  <StartupVeil active={r.initializing} />
  {#if settingsOpen && SettingsDialog}<SettingsDialog bind:open={settingsOpen} onOpenChange={(open: boolean) => settingsOpen = open} settings={r.settings} onSetSetting={(key: never, value: never) => r.setSetting(key, value)} overlay={r.overlayStatus} onCopyOverlay={() => r.copyOverlayUrl()} onOpenOverlay={() => r.openOverlayUrl()} busy={r.busy} appVersion={r.appVersion} onOpenUrl={(url: string) => r.open(url)} />{/if}
  <Toaster position={localeInfo(document.documentElement.lang)?.direction === "rtl" ? "bottom-left" : "bottom-right"} />
</div>
