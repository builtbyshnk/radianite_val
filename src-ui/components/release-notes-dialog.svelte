<script lang="ts">
  import IconCalendarEvent from "lucide-svelte/icons/calendar-days"
  import IconExternalLink from "lucide-svelte/icons/external-link"
  import IconLoader2 from "lucide-svelte/icons/loader-circle"
  import IconRocket from "lucide-svelte/icons/rocket"
  import DOMPurify from "dompurify"
  import { marked } from "marked"
  import { untrack } from "svelte"
  import * as Dialog from "@/components/ui/dialog"
  import { Button } from "@/components/ui/button"
  import { ScrollArea } from "@/components/ui/scroll-area"
  import { formatDate } from "@/lib/format"
  import { locale } from "@/lib/locale.svelte"
  import { openUrl } from "@tauri-apps/plugin-opener"
  type Release = {
    version: string
    body?: string | null
    date?: string | null
    url?: string | null
  }
  let {
    open = $bindable(),
    onOpenChange,
    release,
    fetchFromGitHub = false,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    release: Release
    fetchFromGitHub?: boolean
  } = $props()
  let notes = $state<Release>(untrack(() => release)),
    loading = $state(false),
    error = $state(false)
  let version = $derived(notes.version.replace(/^v/i, "")),
    releaseUrl = $derived(
      notes.url ??
        `https://github.com/builtbyshnk/radianite_val/releases/tag/v${version}`,
    )
  let html = $derived(
    DOMPurify.sanitize(
      marked.parse(notes.body?.trim() || locale.t("updates.noReleaseNotes"), {
        async: false,
      }),
      { USE_PROFILES: { html: true } },
    ),
  )
  $effect(() => {
    onOpenChange(open)
  })
  $effect(() => {
    if (!open || !fetchFromGitHub) return
    const controller = new AbortController()
    loading = true
    fetch(
      `https://api.github.com/repos/builtbyshnk/radianite_val/releases/tags/v${version}`,
      { signal: controller.signal },
    )
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((data) => {
        notes = {
          ...notes,
          body: data.body,
          date: data.published_at,
          url: data.html_url,
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") error = true
      })
      .finally(() => {
        loading = false
      })
    return () => controller.abort()
  })
  function handleLinks(event: MouseEvent) {
    const link = (event.target as Element).closest("a")
    if (link instanceof HTMLAnchorElement) {
      event.preventDefault()
      if (/^https?:/i.test(link.href)) void openUrl(link.href)
    }
  }
</script>

<Dialog.Root bind:open
  ><Dialog.Content
    class="flex h-[38rem] max-h-[calc(100%-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
    ><header class="flex items-start gap-3 border-b px-7 py-5 pe-14">
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        ><IconRocket class="size-5" /></span
      >
      <div class="min-w-0 flex-1">
        <Dialog.Title class="text-base"
          >{locale.t("updates.releaseNotesTitle", { version })}</Dialog.Title
        ><Dialog.Description class="mt-1 flex items-center gap-1.5"
          >{#if notes.date}<IconCalendarEvent class="size-3.5" />{formatDate(
              new Date(notes.date),
            )}{:else}{locale.t(
              "updates.releaseNotesDescription",
            )}{/if}</Dialog.Description
        >
      </div>
      <Button variant="outline" size="sm" onclick={() => openUrl(releaseUrl)}
        ><IconExternalLink data-icon="inline-start" />{locale.t(
          "updates.viewOnGitHub",
        )}</Button
      >
    </header>
    <ScrollArea class="min-h-0 flex-1"
      ><div class="p-7">
        {#if loading}<div
            class="flex h-52 items-center justify-center gap-2 text-muted-foreground"
          >
            <IconLoader2 class="size-4 animate-spin" />{locale.t(
              "updates.loadingReleaseNotes",
            )}
          </div>{:else if error}<div
            class="flex h-52 items-center justify-center text-center text-muted-foreground"
          >
            {locale.t("updates.releaseNotesError")}
          </div>{:else}<div
            class="release-notes"
            role="presentation"
            onclick={handleLinks}
            onkeydown={() => undefined}
          >
            {@html html}
          </div>{/if}
      </div></ScrollArea
    ></Dialog.Content
  ></Dialog.Root
>

<style>
  .release-notes :global(h1) {
    margin-bottom: 1rem;
    font-size: 1.25rem;
    font-weight: 600;
  }
  .release-notes :global(h2) {
    margin-top: 1.75rem;
    margin-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.5rem;
    font-size: 1rem;
    line-height: 1.5rem;
    font-weight: 600;
  }
  .release-notes :global(h2:first-child) {
    margin-top: 0;
  }
  .release-notes :global(h3) {
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
  }
  .release-notes :global(p),
  .release-notes :global(ul),
  .release-notes :global(ol) {
    margin-bottom: 0.75rem;
    color: var(--muted-foreground);
    font-size: 0.875rem;
    line-height: 1.5rem;
  }
  .release-notes :global(ul) {
    list-style: disc;
    padding-inline-start: 1.25rem;
  }
  .release-notes :global(ol) {
    list-style: decimal;
    padding-inline-start: 1.25rem;
  }
  .release-notes :global(li + li) {
    margin-top: 0.25rem;
  }
  .release-notes :global(a) {
    color: var(--primary);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .release-notes :global(code) {
    border-radius: 0.25rem;
    background: var(--muted);
    padding: 0.125rem 0.375rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--foreground);
  }
</style>
