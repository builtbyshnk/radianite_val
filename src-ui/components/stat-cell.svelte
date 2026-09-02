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

<div
  class="group/stat flex min-w-0 items-center gap-2.5 rounded-lg p-1 -m-1 transition-colors hover:bg-white/[0.03]"
>
  <span
    class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground transition-colors group-hover/stat:bg-muted group-hover/stat:text-foreground [&_svg]:size-4"
    >{@render icon()}</span
  >
  <div class="min-w-0 flex-1">
    <p
      class="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase transition-colors group-hover/stat:text-muted-foreground/80"
    >
      {label}
    </p>
    <p
      title={value}
      class:text-foreground={accent}
      class:text-primary={tone}
      class="truncate rounded-sm text-sm font-semibold outline-none"
    >
      {value}
    </p>
  </div>
</div>
