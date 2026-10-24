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

<Card class={cn("gap-3 rounded-lg [--card-spacing:--spacing(3)]", className)}>
  <div class="flex items-center justify-between gap-2 px-3.5 pt-0.5">
    <div class="flex items-center gap-2">
      <span
        class="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4.5 [&_svg]:shrink-0"
        >{@render icon()}</span
      >
      <h2 class="text-sm font-medium text-foreground">
        {title}
      </h2>
    </div>
    {#if action}{@render action()}{/if}
  </div>
  <div class="px-3.5 pb-0.5">{@render children()}</div>
</Card>
