<script lang="ts">
  import AppIcon from "@/components/app-icon.svelte"
  import { locale } from "@/lib/locale.svelte"
  let { active }: { active: boolean } = $props()
</script>

<div
  role="status"
  aria-live="polite"
  aria-hidden={!active}
  class:startup-veil-visible={active}
  class:startup-veil-hidden={!active}
  class="startup-veil"
>
  <div class="startup-glow"></div>
  <AppIcon class="size-12 rounded-lg" />
  <div class="text-center">
    <p class="text-lg font-semibold tracking-tight">
      {locale.t("common.appName")}
    </p>
    <p class="mt-1 text-xs text-muted-foreground">
      {locale.t("startup.preparing")}
    </p>
  </div>
  <div class="startup-progress" aria-hidden="true"><span></span></div>
</div>
