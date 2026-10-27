<script lang="ts">
  import { Select as SelectPrimitive } from "bits-ui"
  import SelectPortal from "./select-portal.svelte"
  import SelectScrollUpButton from "./select-scroll-up-button.svelte"
  import SelectScrollDownButton from "./select-scroll-down-button.svelte"
  import { cn, type WithoutChild } from "@/lib/utils.js"
  import { locale } from "@/lib/locale.svelte"
  import type { ComponentProps } from "svelte"
  import type { WithoutChildrenOrChild } from "@/lib/utils.js"

  let {
    ref = $bindable(null),
    class: className,
    sideOffset = 4,
    portalProps,
    children,
    preventScroll = true,
    ...restProps
  }: WithoutChild<SelectPrimitive.ContentProps> & {
    portalProps?: WithoutChildrenOrChild<ComponentProps<typeof SelectPortal>>
  } = $props()
</script>

<SelectPortal {...portalProps}>
  <SelectPrimitive.Content
    bind:ref
    {sideOffset}
    {preventScroll}
    data-slot="select-content"
    dir={locale.direction}
    class={cn(
      "data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 data-open:zoom-in-95 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--bits-select-content-transform-origin) duration-100 ease-out motion-reduce:animate-none",
      "bg-popover text-popover-foreground ring-border relative isolate z-50 max-h-[min(var(--bits-select-content-available-height),18rem)] min-w-36 overflow-x-hidden overflow-y-auto rounded-lg shadow-md ring-1",
      className,
    )}
    {...restProps}
  >
    <SelectScrollUpButton />
    <SelectPrimitive.Viewport
      class={cn("w-full min-w-(--bits-select-anchor-width) p-1 scroll-my-1")}
    >
      {@render children?.()}
    </SelectPrimitive.Viewport>
    <SelectScrollDownButton />
  </SelectPrimitive.Content>
</SelectPortal>
