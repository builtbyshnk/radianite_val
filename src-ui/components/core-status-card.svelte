<script lang="ts">
  import IconActivity from "@solar-icons/svelte/bold/pulse"
  import IconCircleCheck from "@solar-icons/svelte/bold/check-circle"
  import IconCircleX from "@solar-icons/svelte/bold/close-circle"
  import Panel from "@/components/panel.svelte"
  import { locale } from "@/lib/locale.svelte"
  import type { DiagnosticSnapshot } from "@/lib/types"
  let { diagnostics }: { diagnostics: DiagnosticSnapshot } = $props()
  let rows = $derived([
    { label: locale.t("core.riotConnected"), ready: diagnostics.localApiReady },
    {
      label: locale.t("core.valorantRunning"),
      ready: diagnostics.valorantSessionPresent,
    },
    {
      label: locale.t("core.accountReady"),
      ready: diagnostics.accessTokenReady && diagnostics.entitlementTokenReady,
    },
  ])
</script>

<Panel title={locale.t("core.title")}
  >{#snippet icon()}<IconActivity />{/snippet}
  <div class="flex flex-col">
    {#each rows as row}<div
        class="-mx-1.5 flex items-center justify-between gap-3 rounded-md border-t border-border/60 px-1.5 py-2 first:border-t-0"
      >
        <span class="flex items-center gap-2.5 text-sm"
          >{#if row.ready}<IconCircleCheck
              class="size-4.5 text-success"
            />{:else}<IconCircleX
              class="size-4.5 text-muted-foreground"
            />{/if}{row.label}</span
        ><span
          class:text-success={row.ready}
          class:text-muted-foreground={!row.ready}
          class="text-sm font-semibold"
          >{row.ready
            ? locale.t("common.ready")
            : locale.t("common.notReady")}</span
        >
      </div>{/each}
  </div></Panel
>
