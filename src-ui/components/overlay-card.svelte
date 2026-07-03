<script lang="ts">
  import IconBroadcast from "@tabler/icons-svelte/icons/broadcast"
  import IconCopy from "@tabler/icons-svelte/icons/copy"
  import IconExternalLink from "@tabler/icons-svelte/icons/external-link"
  import IconHelpCircle from "@tabler/icons-svelte/icons/help-circle"
  import Panel from "@/components/panel.svelte"
  import { Button } from "@/components/ui/button"
  import { locale } from "@/lib/locale.svelte"
  import type { OverlayStatus } from "@/lib/types"
  let {
    overlay,
    onCopy,
    onOpen,
  }: { overlay: OverlayStatus; onCopy: () => void; onOpen: () => void } =
    $props()
  let url = $derived(overlay.url ?? null)
</script>

<Panel title={locale.t("overlay.title")}>
  {#snippet icon()}<IconBroadcast />{/snippet}{#snippet action()}<span
      class="text-muted-foreground"
      title={locale.t("overlay.help")}><IconHelpCircle class="size-4" /></span
    >{/snippet}
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-end gap-3">
      <div class="min-w-0 flex-1">
        <p class="mb-1 text-xs text-muted-foreground">
          {locale.t("overlay.sourceUrl")}
        </p>
        <code
          class="block w-full truncate rounded-md border bg-background/60 px-2.5 py-1.5 font-mono text-xs"
          >{url ?? locale.t("overlay.notRunning")}</code
        >
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" onclick={onCopy} disabled={!url}
          ><IconCopy data-icon="inline-start" />{locale.t(
            "overlay.copyUrl",
          )}</Button
        ><Button variant="outline" onclick={onOpen} disabled={!url}
          ><IconExternalLink data-icon="inline-start" />{locale.t(
            "common.open",
          )}</Button
        >
      </div>
    </div>
    <div class="flex items-center justify-between">
      <p class="text-xs text-muted-foreground">
        {locale.t("overlay.suggestedSize")}
        <span class="font-mono text-foreground">360 × 90</span>
      </p>
      <p class="text-xs text-muted-foreground">
        {locale.t("overlay.livePreview")}
      </p>
    </div>
    <div
      class="flex justify-center overflow-hidden rounded-lg border bg-background/60 p-3"
    >
      {#if url}<iframe
          title={locale.t("overlay.previewTitle")}
          src={url}
          class="h-[90px] w-[360px] max-w-full border-0 bg-transparent"
        ></iframe>{:else}<div
          class="flex h-[90px] w-full items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          <IconBroadcast class="size-4" />{locale.t(
            "overlay.previewUnavailable",
          )}
        </div>{/if}
    </div>
  </div>
</Panel>
