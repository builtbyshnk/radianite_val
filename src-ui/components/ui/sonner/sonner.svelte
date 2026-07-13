<script lang="ts">
  import {
    Toaster as Sonner,
    type ToasterProps as SonnerProps,
  } from "svelte-sonner"
  import IconAlertOctagon from "lucide-svelte/icons/octagon-alert"
  import IconAlertTriangle from "lucide-svelte/icons/triangle-alert"
  import IconCircleCheck from "lucide-svelte/icons/circle-check"
  import IconInfoCircle from "lucide-svelte/icons/info"
  import IconLoader2 from "lucide-svelte/icons/loader-circle"

  let { ...restProps }: SonnerProps = $props()
</script>

<Sonner
  theme="dark"
  class="toaster group"
  style="--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border);"
  {...restProps}
>
  {#snippet loadingIcon()}
    <IconLoader2 class="size-4 animate-spin" />
  {/snippet}
  {#snippet successIcon()}
    <IconCircleCheck class="size-4" />
  {/snippet}
  {#snippet errorIcon()}
    <IconAlertOctagon class="size-4" />
  {/snippet}
  {#snippet infoIcon()}
    <IconInfoCircle class="size-4" />
  {/snippet}
  {#snippet warningIcon()}
    <IconAlertTriangle class="size-4" />
  {/snippet}
</Sonner>
