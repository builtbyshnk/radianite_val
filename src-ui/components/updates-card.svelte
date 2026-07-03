<script lang="ts">
  import IconCalendarEvent from "@tabler/icons-svelte/icons/calendar-event"
  import IconClockCheck from "@tabler/icons-svelte/icons/clock-check"
  import IconDownload from "@tabler/icons-svelte/icons/download"
  import IconRefresh from "@tabler/icons-svelte/icons/refresh"
  import IconRocket from "@tabler/icons-svelte/icons/rocket"
  import IconShieldCheck from "@tabler/icons-svelte/icons/shield-check"
  import IconSparkles from "@tabler/icons-svelte/icons/sparkles"
  import IconTag from "@tabler/icons-svelte/icons/tag"
  import Panel from "@/components/panel.svelte"
  import RelativeTime from "@/components/relative-time.svelte"
  import { Button } from "@/components/ui/button"
  import { formatDate } from "@/lib/format"
  import { locale } from "@/lib/locale.svelte"
  import { cn } from "@/lib/utils"
  import type { UpdaterState } from "@/lib/types"
  let { updater, version, canInstall, lastChecked, now, onCheck, onInstall }: { updater: UpdaterState; version: string | null; canInstall: boolean; lastChecked: Date | null; now: number; onCheck: () => void; onInstall: () => void } = $props()
  let selected = $state<"current" | "latest" | null>(null)
  let DialogComponent = $state<any>(null)
  let checking = $derived(updater.status === "checking" || updater.status === "installing")
  let current = $derived(updater.currentVersion ?? version ?? locale.t("common.notAvailable"))
  let hasUpdate = $derived(updater.status === "available" && Boolean(updater.version))
  let releaseNotes = $derived(hasUpdate ? updater.body?.trim() || null : null)
  let status = $derived(updater.status === "available" ? locale.t("updates.availableShort", { version: updater.version }) : locale.t(`updates.state.${updater.status}`))
  let message = $derived(updater.message.detail ? locale.t("errors.withDetail", { message: locale.t(updater.message.key, updater.message.args), detail: updater.message.detail }) : locale.t(updater.message.key, updater.message.args))
  async function openRelease(kind: "current" | "latest") { selected = kind; DialogComponent = (await import("@/components/release-notes-dialog.svelte")).default }
</script>
<Panel title={locale.t("updates.title")}>{#snippet icon()}<IconRocket />{/snippet}<div class="flex flex-col gap-2.5"><div class="flex flex-col">
  <button type="button" class="info-row rounded-sm text-start transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring" onclick={() => openRelease("current")} disabled={current === locale.t("common.notAvailable")}><span><IconTag />{locale.t("updates.currentVersion")}</span><strong class="font-mono">v{current}</strong></button>
  <div class="info-row"><span><IconRocket />{locale.t("updates.status")}</span><strong class={updater.status === "available" ? "text-primary" : updater.status === "error" ? "text-destructive" : updater.status === "current" ? "text-success" : "text-muted-foreground"}>{status}</strong></div>
  <div class="info-row"><span><IconClockCheck />{locale.t("updates.lastChecked")}</span><strong class="font-mono"><RelativeTime date={lastChecked} {now} fallback={locale.t("updates.never")} coarse /></strong></div>
  {#if hasUpdate}<button type="button" class="info-row rounded-sm text-start transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${locale.t("updates.latestVersion")} v${updater.version}`} onclick={() => openRelease("latest")}><span><IconSparkles />{locale.t("updates.latestVersion")}</span><strong class="font-mono text-primary">v{updater.version}</strong></button>{/if}
  {#if hasUpdate && updater.date}<div class="info-row"><span><IconCalendarEvent />{locale.t("updates.released")}</span><strong class="font-mono">{formatDate(new Date(updater.date.replace(/ \d{2}:\d{2}:\d{2}.*$/, "")))}</strong></div>{/if}
  </div>{#if updater.status === "installing"}<div class="flex flex-col gap-1.5"><div class="h-1.5 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary transition-[width]" style:width={`${updater.progress ?? 35}%`}></div></div><p class="text-xs text-muted-foreground">{message}</p></div>{:else}<p class={cn("text-xs", updater.status === "error" ? "text-destructive" : "text-muted-foreground")}>{message}</p>{/if}
  {#if releaseNotes}<div class="rounded-lg border bg-background/40 p-3"><p class="mb-1 flex items-center gap-1.5 text-xs font-semibold text-foreground"><IconSparkles class="size-3.5 text-primary" />{locale.t("updates.whatsNew")}</p><p class="line-clamp-3 text-xs whitespace-pre-line text-muted-foreground">{releaseNotes}</p></div>{/if}<p class="flex items-center gap-1.5 text-xs text-muted-foreground"><IconShieldCheck class="size-3.5 text-success" />{locale.t("updates.signed")}</p><div class="grid grid-cols-2 gap-2"><Button variant="outline" size="sm" onclick={onCheck} disabled={checking} aria-busy={updater.status === "checking"}><IconRefresh data-icon="inline-start" class={updater.status === "checking" ? "animate-spin" : undefined} />{locale.t("updates.check")}</Button><Button size="sm" onclick={onInstall} disabled={!canInstall || checking}><IconDownload data-icon="inline-start" />{locale.t("updates.install")}</Button></div></div></Panel>
{#if selected && DialogComponent}<DialogComponent open={true} onOpenChange={(open: boolean) => { if (!open) selected = null }} fetchFromGitHub={selected === "current"} release={selected === "latest" ? { version: updater.version ?? "", body: updater.body, date: updater.date } : { version: current }} />{/if}
<style>.info-row{display:flex;width:100%;align-items:center;justify-content:space-between;gap:.75rem;border-top:1px solid color-mix(in oklab,var(--border) 60%,transparent);padding:.375rem 0;line-height:1.25rem}.info-row:first-child{border-top:0}.info-row span{display:flex;align-items:center;gap:.625rem;font-size:.875rem;color:var(--foreground)}.info-row span :global(svg){width:1rem;height:1rem;color:var(--muted-foreground)}.info-row strong{font-size:.875rem;font-weight:600}</style>
