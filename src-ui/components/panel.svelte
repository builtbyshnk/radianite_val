<script lang="ts">
  import type { Snippet } from "svelte"
  import { Card } from "@/components/ui/card"
  import { cn } from "@/lib/utils"
  let {
    title,
    icon,
    action,
    children,
    class: className,
  }: {
    title: string
    icon: Snippet
    action?: Snippet
    children: Snippet
    class?: string
  } = $props()
</script>

<Card class={cn("gap-2.5 rounded-xl [--card-spacing:--spacing(3)]", className)}>
  <div class="flex items-center justify-between gap-2 px-3.5 pt-0.5">
    <div class="flex items-center gap-2">
      <span class="text-primary [&_svg]:size-4">{@render icon()}</span>
      <h2
        class="text-xs font-semibold tracking-[0.15em] text-foreground/90 uppercase"
      >
        {title}
      </h2>
    </div>
    {#if action}{@render action()}{/if}
  </div>
  <div class="px-3.5 pb-0.5">{@render children()}</div>
</Card>
