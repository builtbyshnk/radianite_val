<script lang="ts">
  import {
    Toaster as Sonner,
    type ToasterProps as SonnerProps,
  } from "svelte-sonner"
  import IconAlertOctagon from "@solar-icons/svelte/bold/danger-circle"
  import IconAlertTriangle from "@solar-icons/svelte/bold/danger-triangle"
  import IconCircleCheck from "@solar-icons/svelte/bold/check-circle"
  import IconInfoCircle from "@solar-icons/svelte/bold/info-circle"
  import IconLoader2 from "@solar-icons/svelte/bold/refresh"

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
