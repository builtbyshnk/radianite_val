<script lang="ts">
  import IconCheck from "@solar-icons/svelte/bold/check"
  import IconCopy from "@solar-icons/svelte/bold/copy"
  import IconExternalLink from "@solar-icons/svelte/bold/square-top-down"
  import { toast } from "svelte-sonner"
  import { Button } from "@/components/ui/button"
  import { locale } from "@/lib/locale.svelte"
  import upiQrUrl from "@/assets/upi-qr.svg"

  let { onOpenUrl }: { onOpenUrl: (url: string) => void } = $props()

  const UPI_VPA = "radcolor@upi"
  const RAZORPAY_URL = "https://razorpay.me/@shashankbaghel705"
  const GITHUB_SPONSORS_URL = "https://github.com/sponsors/radcolor"

  let copied = $state(false)
  let copyTimeout: ReturnType<typeof setTimeout> | null = null

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(UPI_VPA)
      copied = true
      toast.success(locale.t("settings.upiCopied"))
      if (copyTimeout) clearTimeout(copyTimeout)
      copyTimeout = setTimeout(() => {
        copied = false
      }, 1500)
    } catch {
      toast.error(locale.t("common.copyFailed"))
    }
  }
</script>

<div class="flex flex-col gap-7 p-7">
  <header class="flex flex-col gap-1.5">
    <h2 class="font-heading text-base font-medium">
      {locale.t("settings.nav.donate")}
    </h2>
    <p class="text-xs text-muted-foreground">
      {locale.t("settings.donateDescription")}
    </p>
  </header>

  <section class="rounded-lg border bg-background/40 p-5">
    <div
      class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between"
    >
      <div class="max-w-prose">
        <h3 class="font-heading text-lg font-semibold tracking-tight">UPI</h3>
        <p class="mt-3 text-xs leading-5 text-muted-foreground">
          {locale.t("settings.upiDescription")}
        </p>

        <div class="mt-5">
          <p class="text-xs text-muted-foreground">
            {locale.t("settings.upiId")}
          </p>
          <div class="mt-1.5 flex items-center gap-2.5">
            <p class="break-all font-mono text-base font-semibold">
              {UPI_VPA}
            </p>
            <Button
              variant="outline"
              size="xs"
              class="h-7 px-2 text-xs"
              onclick={copyUpi}
              aria-label={locale.t("settings.copyUpiId")}
            >
              {#if copied}
                <IconCheck class="size-3.5 text-success" />
              {:else}
                <IconCopy class="size-3.5" />
              {/if}
              <span class="ms-1"
                >{copied
                  ? locale.t("common.copied")
                  : locale.t("common.copy")}</span
              >
            </Button>
          </div>
        </div>
      </div>

      <div
        class="mx-auto w-fit shrink-0 overflow-hidden rounded-lg border border-white/25 bg-white shadow-sm md:mx-0"
      >
        <img
          src={upiQrUrl}
          alt={locale.t("settings.upiQrAlt", { vpa: UPI_VPA })}
          class="block size-40"
          width="160"
          height="160"
        />
      </div>
    </div>
  </section>

  <section class="grid gap-4 md:grid-cols-2">
    <div class="flex flex-col rounded-lg border bg-background/40 p-5">
      <h3 class="font-heading text-lg font-semibold tracking-tight">
        Razorpay
      </h3>
      <p class="mt-3 flex-1 text-xs leading-5 text-muted-foreground">
        {locale.t("settings.razorpayDescription")}
      </p>
      <Button
        variant="outline"
        class="mt-5 w-fit rounded-full px-4"
        onclick={() => onOpenUrl(RAZORPAY_URL)}
      >
        <IconExternalLink data-icon="inline-start" />{locale.t(
          "settings.donateWithRazorpay",
        )}
      </Button>
    </div>

    <div class="flex flex-col rounded-lg border bg-background/40 p-5">
      <h3 class="font-heading text-lg font-semibold tracking-tight">
        GitHub Sponsors
      </h3>
      <p class="mt-3 flex-1 text-xs leading-5 text-muted-foreground">
        {locale.t("settings.githubSponsorsDescription")}
      </p>
      <Button
        variant="outline"
        class="mt-5 w-fit rounded-full px-4"
        onclick={() => onOpenUrl(GITHUB_SPONSORS_URL)}
      >
        <IconExternalLink data-icon="inline-start" />{locale.t(
          "settings.sponsorOnGithub",
        )}
      </Button>
    </div>
  </section>
</div>
