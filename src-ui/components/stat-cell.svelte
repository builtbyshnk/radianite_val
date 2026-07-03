<script lang="ts">
  import type { Snippet } from "svelte"
  let { icon, label, value, accent = false, tone = false }: { icon: Snippet; label: string; value: string; accent?: boolean; tone?: boolean } = $props()
</script>
<div class="flex min-w-0 items-center gap-2.5"><span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground [&_svg]:size-4">{@render icon()}</span><div class="min-w-0"><p class="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">{label}</p><p title={value} class:text-foreground={accent} class:text-primary={tone} class="truncate rounded-sm text-sm font-semibold outline-none">{value}</p></div></div>
