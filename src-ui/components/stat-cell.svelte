<script lang="ts">
  import type { Snippet } from "svelte"
  let {
    icon,
    label,
    value,
    accent = false,
    tone = false,
  }: {
    icon: Snippet
    label: string
    value: string
    accent?: boolean
    tone?: boolean
  } = $props()
</script>

<div class="flex min-w-0 items-center gap-2.5">
  <span
    class="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4.5 [&_svg]:shrink-0"
    >{@render icon()}</span
  >
  <div class="min-w-0 flex-1">
    <p class="text-xs text-muted-foreground">
      {label}
    </p>
    <p
      class:text-foreground={accent}
      class:text-primary={tone}
      class="truncate rounded-sm text-sm font-medium outline-none"
    >
      {value}
    </p>
  </div>
</div>
