<script lang="ts">
  import IconExternalLink from "lucide-svelte/icons/external-link"
  import { Button } from "@/components/ui/button"
  import { locale } from "@/lib/locale.svelte"

  let { onOpenUrl }: { onOpenUrl: (url: string) => void } = $props()

  const UPI_VPA = "radcolor@upi"
  const UPI_URI = `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent("radcolor")}&cu=INR`
  const UPI_QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encodeURIComponent(UPI_URI)}`
  const RAZORPAY_URL = "https://razorpay.me/@shashankbaghel705"
  const GITHUB_SPONSORS_URL = "https://github.com/sponsors/radcolor"
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

  <section
    class="rounded-lg border bg-background/40 p-5 transition-[background-color,border-color] duration-150 hover:border-white/20 hover:bg-white/[0.025]"
  >
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
          <p class="mt-1 break-all font-mono text-base font-semibold">
            {UPI_VPA}
          </p>
        </div>
      </div>

      <div
        class="mx-auto w-fit shrink-0 rounded-lg border bg-white p-2 md:mx-0"
      >
        <img
          src={UPI_QR_URL}
          alt={locale.t("settings.upiQrAlt", { vpa: UPI_VPA })}
          class="size-40"
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
