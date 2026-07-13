<script lang="ts">
  import IconBroadcast from "@icons-pack/svelte-simple-icons/icons/SiObsstudio"
  import IconCopy from "lucide-svelte/icons/copy"
  import IconHelpCircle from "lucide-svelte/icons/circle-help"
  import OverlayThemeSelect from "@/components/overlay-theme-select.svelte"
  import Panel from "@/components/panel.svelte"
  import { Button } from "@/components/ui/button"
  import { Switch } from "@/components/ui/switch"
  import { locale } from "@/lib/locale.svelte"
  import { themedOverlayUrl, type OverlayTheme } from "@/lib/overlay-themes"
  import type { OverlayStatus } from "@/lib/types"

  let {
    overlay,
    theme,
    overlayHideDetails,
    onCopy,
    onThemeChange,
    onOverlayHideDetailsChange,
  }: {
    overlay: OverlayStatus
    theme: OverlayTheme
    overlayHideDetails: boolean
    onCopy: () => void
    onThemeChange: (theme: OverlayTheme) => void
    onOverlayHideDetailsChange: (value: boolean) => void
  } = $props()

  let url = $derived(themedOverlayUrl(overlay.url ?? null, theme))
  const privacyLabel = $derived(locale.t("settings.overlayHideDetails"))
</script>

<Panel title={locale.t("overlay.title")}>
  {#snippet icon()}<IconBroadcast
      title=""
      aria-hidden="true"
    />{/snippet}{#snippet action()}<div class="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onclick={onCopy}
        disabled={!url}
        title={url
          ? locale.t("overlay.copyUrl")
          : locale.t("overlay.notRunning")}
        ><IconCopy data-icon="inline-start" />{locale.t(
          "overlay.copyUrl",
        )}</Button
      ><span class="text-muted-foreground" title={locale.t("overlay.help")}
        ><IconHelpCircle class="size-4" /></span
      >
    </div>{/snippet}
  <div class="flex flex-col gap-2">
    <div class="grid grid-cols-2 gap-2">
      <OverlayThemeSelect compact value={theme} onChange={onThemeChange} />
      <label
        class="flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border bg-background/40 px-2 py-1.5"
        title={locale.t("settings.overlayHideDetailsDescription")}
        ><span class="truncate text-xs font-medium">{privacyLabel}</span><Switch
          class="shrink-0"
          checked={overlayHideDetails}
          onCheckedChange={onOverlayHideDetailsChange}
        /></label
      >
    </div>
    <p class="text-[11px] text-muted-foreground">
      {locale.t("overlay.suggestedSize")}
      <span class="font-mono text-foreground">720 × 200</span>
    </p>
    <div class="overflow-hidden rounded-lg border bg-background/60 p-2">
      {#if url}<div
          class="preview-host aspect-[720/200] w-full overflow-hidden rounded-md"
        >
          <iframe
            title={locale.t("overlay.previewTitle")}
            src={url}
            class="preview-iframe"
          ></iframe>
        </div>{:else}<div
          class="flex aspect-[720/200] w-full items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          <IconBroadcast class="size-4" title="" aria-hidden="true" />{locale.t(
            "overlay.previewUnavailable",
          )}
        </div>{/if}
    </div>
  </div>
</Panel>

<style>
  .preview-host {
    container-type: inline-size;
  }

  .preview-iframe {
    display: block;
    width: 720px;
    height: 200px;
    border: 0;
    background: transparent;
    transform-origin: top left;
    transform: scale(calc(100cqw / 720px));
  }
</style>
