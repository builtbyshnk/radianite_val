<script lang="ts">
  import IconBrandDiscord from "@tabler/icons-svelte/icons/brand-discord"
  import IconPlayerPlay from "@tabler/icons-svelte/icons/player-play"
  import IconPlayerStop from "@tabler/icons-svelte/icons/player-stop"
  import AppIcon from "@/components/app-icon.svelte"
  import Panel from "@/components/panel.svelte"
  import { Button } from "@/components/ui/button"
  import { formatUptime } from "@/lib/format"
  import { locale } from "@/lib/locale.svelte"
  import type { LiveSnapshot, RpcStatus, ValorantPresentation } from "@/lib/types"
  let { rpc, snapshot, presentation, busy, onToggle, now }: { rpc: RpcStatus; snapshot: LiveSnapshot | null; presentation: ValorantPresentation | null; busy: boolean; onToggle: () => void; now: number } = $props()
  let canToggle = $derived(rpc.configured || rpc.enabled)
  let preview = $derived(rpc.preview ?? null)
  let agentUrl = $derived(presentation?.agentIconUrl ?? null)
  let largeUrl = $derived(snapshot?.phase === "pregame" ? agentUrl : snapshot?.phase === "ingame" || snapshot?.phase === "range" ? presentation?.mapListViewIconUrl ?? agentUrl : null)
</script>
<Panel title={locale.t("discord.title")}>
  {#snippet icon()}<IconBrandDiscord />{/snippet}{#snippet action()}<Button variant="outline" size="sm" onclick={onToggle} disabled={busy || !canToggle}>{#if rpc.enabled}<IconPlayerStop data-icon="inline-start" />{:else}<IconPlayerPlay data-icon="inline-start" />{/if}{rpc.enabled ? locale.t("common.disable") : locale.t("common.enable")}</Button>{/snippet}
  <div class="flex flex-col gap-3"><div class="flex items-center gap-2 text-sm"><span class:bg-success={rpc.connected} class:bg-muted-foreground={!rpc.connected} class="size-2 rounded-full"></span><span class:text-success={rpc.connected} class:text-muted-foreground={!rpc.connected} class="font-medium">{rpc.connected ? locale.t("common.connected") : locale.t("common.disconnected")}</span></div><p class="text-xs text-muted-foreground">{locale.t("discord.friendsSee")}</p>
  {#if preview}<div class="rounded-lg border border-white/5 bg-[#232428] p-3 text-[#dbdee1]" dir="auto"><p class="mb-2 text-[0.65rem] font-bold tracking-wide text-[#b5bac1] uppercase">{locale.t("discord.playing")}</p><div class="flex gap-3"><div class="relative size-[52px] shrink-0"><div class="flex size-full items-center justify-center overflow-hidden rounded-lg bg-[#1a1b1e]">{#if largeUrl}<img src={largeUrl} alt="" class="size-full object-cover" />{:else}<AppIcon class="size-9 rounded-md" />{/if}</div><span class="absolute -bottom-1 -end-1 flex size-5 items-center justify-center overflow-hidden rounded-full bg-[#232428] ring-2 ring-[#232428]">{#if agentUrl}<img src={agentUrl} alt="" class="size-4 rounded-full object-cover" />{/if}</span></div><div class="min-w-0 flex-1 text-sm leading-tight"><p class="truncate font-semibold text-white">{preview.name}</p><p class="truncate text-[0.7rem] text-[#b5bac1]">{preview.details}</p><p class="truncate text-[0.7rem] text-[#b5bac1]">{preview.state}</p>{#if preview.startedAt}<p class="mt-0.5 truncate text-[0.8rem] text-[#b5bac1]">{locale.t("discord.elapsed", { time: formatUptime(now - preview.startedAt * 1000).replace(/^00:/, "") })}</p>{/if}</div></div></div>{:else}<div class="rounded-lg border bg-[#1a1b1e] p-3 text-sm text-muted-foreground">{canToggle ? locale.t("discord.noMatch") : locale.t("discord.notConfigured")}</div>{/if}</div>
</Panel>
