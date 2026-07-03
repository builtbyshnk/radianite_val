<script lang="ts">
  import { locale } from "@/lib/locale.svelte"
  let {
    date,
    now,
    fallback,
    coarse = false,
  }: {
    date: Date | null
    now: number
    fallback: string
    coarse?: boolean
  } = $props()
  let text = $derived(formatRelative(date, now, fallback, coarse))
  function formatRelative(
    value: Date | null,
    current: number,
    empty: string,
    isCoarse: boolean,
  ) {
    if (!value) return empty
    const seconds = Math.max(0, Math.floor((current - value.getTime()) / 1000))
    if (isCoarse) {
      if (seconds < 60) return locale.t("updates.relativeTime.justNow")
      if (seconds < 120) return locale.t("updates.relativeTime.minuteAgo")
      if (seconds < 21_600) return locale.t("updates.relativeTime.whileAgo")
    }
    const language = document.documentElement.lang || "en-US"
    const formatter = new Intl.RelativeTimeFormat(language, { numeric: "auto" })
    if (seconds < 10) return formatter.format(-1, "second")
    if (seconds < 60) return formatter.format(-seconds, "second")
    if (seconds < 3600)
      return formatter.format(-Math.round(seconds / 60), "minute")
    if (seconds < 86400)
      return formatter.format(-Math.round(seconds / 3600), "hour")
    return formatter.format(-Math.round(seconds / 86400), "day")
  }
</script>

{text}
