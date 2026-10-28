<script lang="ts">
  import { Dialog as DialogPrimitive } from "bits-ui"
  import DialogPortal from "./dialog-portal.svelte"
  import type { Snippet } from "svelte"
  import * as Dialog from "./index.js"
  import { cn, type WithoutChildrenOrChild } from "@/lib/utils.js"
  import type { ComponentProps } from "svelte"
  import IconX from "@solar-icons/svelte/linear/close"
  import { locale } from "@/lib/locale.svelte"

  let {
    ref = $bindable(null),
    class: className,
    portalProps,
    children,
    showCloseButton = true,
    ...restProps
  }: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
    portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>
    children: Snippet
    showCloseButton?: boolean
  } = $props()
</script>

<DialogPortal {...portalProps}>
  <Dialog.Overlay />
  <DialogPrimitive.Content
    bind:ref
    data-slot="dialog-content"
    class={cn(
      "data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 data-open:zoom-in-95 data-closed:zoom-out-95 duration-150 ease-out motion-reduce:animate-none",
      "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-xs/relaxed text-popover-foreground shadow-[0_24px_64px_-12px_rgb(0_0_0/0.85),0_8px_24px_rgb(0_0_0/0.5)] ring-2 ring-foreground/25 outline-none sm:max-w-sm",
      className,
    )}
    {...restProps}
  >
    {@render children?.()}
    {#if showCloseButton}
      <DialogPrimitive.Close data-slot="dialog-close">
        {#snippet child({ props })}
          <button
            {...props}
            type="button"
            aria-label={locale.t("titleBar.close")}
            class="absolute top-2 end-2 flex h-8 w-9 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IconX class="size-4" strokeWidth={2.5} />
          </button>
        {/snippet}
      </DialogPrimitive.Close>
    {/if}
  </DialogPrimitive.Content>
</DialogPortal>
