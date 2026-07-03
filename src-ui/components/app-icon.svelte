<script lang="ts">
  import appIcon from "@/assets/app-icon.png"
  import { cn } from "@/lib/utils"
  let { class: className }: { class?: string } = $props()
</script>

<img src={appIcon} alt="" class={cn("shrink-0 object-cover", className)} />
