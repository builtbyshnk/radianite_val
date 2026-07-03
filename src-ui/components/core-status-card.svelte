<script lang="ts">
  import IconActivity from "@tabler/icons-svelte/icons/activity"
  import IconCircleCheck from "@tabler/icons-svelte/icons/circle-check"
  import IconCircleX from "@tabler/icons-svelte/icons/circle-x"
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
        class="flex items-center justify-between gap-3 border-t border-border/60 py-2 first:border-t-0"
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
