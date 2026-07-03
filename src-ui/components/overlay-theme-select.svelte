<script lang="ts">
  import * as Select from "@/components/ui/select"
  import { locale } from "@/lib/locale.svelte"
  import { cn } from "@/lib/utils"
  import { overlayThemes, type OverlayTheme } from "@/lib/overlay-themes"

  let {
    value,
    onChange,
    compact = false,
    class: className,
  }: {
    value: OverlayTheme
    onChange: (theme: OverlayTheme) => void
    compact?: boolean
    class?: string
  } = $props()

  const label = $derived(locale.t("overlay.theme"))
  const selectedName = $derived(
    overlayThemes.find((theme) => theme.id === value)?.name ?? value,
  )
</script>

<div
  class={cn(
    "flex min-w-0 items-center rounded-lg border bg-background/40",
    compact ? "w-full px-2 py-1.5" : "justify-between gap-4 px-4 py-3.5",
    className,
  )}
>
  {#if !compact}<span class="text-xs font-medium">{label}</span>{/if}
  <Select.Root
    type="single"
    {value}
    onValueChange={(next) => {
      if (next) onChange(next as OverlayTheme)
    }}
  >
    <Select.Trigger
      class={cn(compact ? "h-7 w-full min-w-0" : "min-w-44")}
      aria-label={label}
    >
      <span data-slot="select-value" class="flex-1 truncate text-start"
        >{selectedName}</span
      >
    </Select.Trigger>
    <Select.Content align="end">
      <Select.Group>
        {#each overlayThemes as theme (theme.id)}
          <Select.Item value={theme.id}>{theme.name}</Select.Item>
        {/each}
      </Select.Group>
    </Select.Content>
  </Select.Root>
</div>
