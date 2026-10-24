<script lang="ts">
  import type { HTMLImgAttributes } from "svelte/elements"
  import discordSymbol from "@/assets/discord/discord-symbol-white.svg"
  import { cn } from "@/lib/utils"

  let {
    class: className,
    ...rest
  }: Omit<HTMLImgAttributes, "src" | "alt" | "width" | "height"> = $props()
</script>

<img
  {...rest}
  src={discordSymbol}
  alt=""
  aria-hidden="true"
  width="64"
  height="48"
  class={cn("size-4 shrink-0 object-contain", className)}
/>
