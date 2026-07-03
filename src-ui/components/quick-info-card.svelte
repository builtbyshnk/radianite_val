<script lang="ts">
  import { IconBrandDiscord, IconBroadcast, IconClockHour4, IconInfoCircle, IconTargetArrow } from "@tabler/icons-svelte"
  import Panel from "@/components/panel.svelte"
  import RelativeTime from "@/components/relative-time.svelte"
  import { locale } from "@/lib/locale.svelte"
  import type { LiveSnapshot, OverlayStatus, RpcStatus } from "@/lib/types"
  let { overlay, rpc, snapshot, lastSync, now }: { overlay: OverlayStatus; rpc: RpcStatus; snapshot: LiveSnapshot | null; lastSync: Date | null; now: number } = $props()
  let tracking = $derived(snapshot ? ["pregame", "ingame", "range"].includes(snapshot.phase) : false)
</script>
<Panel title={locale.t("quickInfo.title")}>{#snippet icon()}<IconInfoCircle />{/snippet}<div class="flex flex-col">
  <div class="row"><span><IconBroadcast />{locale.t("quickInfo.overlay")}</span><strong class:text-success={overlay.enabled}>{overlay.enabled ? locale.t("common.ready") : locale.t("common.off")}</strong></div>
  <div class="row"><span><IconBrandDiscord />{locale.t("quickInfo.discord")}</span><strong class:text-success={rpc.connected}>{rpc.connected ? locale.t("common.ready") : rpc.enabled ? locale.t("common.connecting") : locale.t("common.off")}</strong></div>
  <div class="row"><span><IconTargetArrow />{locale.t("quickInfo.tracking")}</span><strong class:text-success={tracking}>{tracking ? locale.t("common.active") : locale.t("common.idle")}</strong></div>
  <div class="row"><span><IconClockHour4 />{locale.t("quickInfo.lastSync")}</span><strong class="font-mono text-foreground"><RelativeTime date={lastSync} {now} fallback="--:--" /></strong></div>
</div></Panel>
<style>.row{display:flex;width:100%;align-items:center;justify-content:space-between;gap:.75rem;border-top:1px solid color-mix(in oklab,var(--border) 60%,transparent);padding:.5rem 0;line-height:1.25rem}.row:first-child{border-top:0}.row span{display:flex;align-items:center;gap:.625rem;font-size:.875rem;color:var(--foreground)}.row span :global(svg){width:1rem;height:1rem;color:var(--muted-foreground)}.row strong{font-size:.875rem;font-weight:600;color:var(--muted-foreground)}</style>
