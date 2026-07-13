<script lang="ts">
  import IconCircleDot from "lucide-svelte/icons/circle-dot"
  import IconMap2 from "lucide-svelte/icons/map"
  import IconShield from "lucide-svelte/icons/shield"
  import IconSwords from "lucide-svelte/icons/swords"
  import IconUser from "lucide-svelte/icons/user"
  import IconUsersGroup from "lucide-svelte/icons/users"
  import IconWorld from "lucide-svelte/icons/globe"
  import AppIcon from "@/components/app-icon.svelte"
  import StatCell from "@/components/stat-cell.svelte"
  import { phaseLabel, playerName, queueLabel } from "@/lib/format"
  import { locale } from "@/lib/locale.svelte"
  import type { LiveSnapshot, ValorantPresentation } from "@/lib/types"
  let {
    snapshot,
    presentation,
  }: {
    snapshot: LiveSnapshot | null
    presentation: ValorantPresentation | null
  } = $props()
  let isLive = $derived(
    snapshot ? ["pregame", "ingame", "range"].includes(snapshot.phase) : false,
  )
  let empty = $derived(locale.t("common.notAvailable"))
  let agentUrl = $derived(presentation?.agentPortraitUrl ?? null)
  let mapUrl = $derived(presentation?.mapSplashUrl ?? null)
  let rankUrl = $derived(
    presentation?.rankIconUrl ?? snapshot?.rank?.iconUrl ?? null,
  )
  let score = $derived(
    snapshot?.score
      ? `${snapshot.score.ally} – ${snapshot.score.enemy}`
      : empty,
  )
  let standby = $derived(
    snapshot && !isLive
      ? snapshot.phase === "matchmaking"
        ? {
            title: locale.t("match.findingTitle"),
            subtitle: locale.t("match.findingDescription"),
          }
        : snapshot.phase === "menus"
          ? {
              title: locale.t("match.menusTitle"),
              subtitle: locale.t("match.menusDescription"),
            }
          : {
              title: locale.t("match.serviceTitle"),
              subtitle: locale.t("match.serviceDescription"),
            }
      : null,
  )
  let name = $derived(playerName(snapshot) ?? empty)
  let queue = $derived(
    queueLabel(snapshot?.queueId, snapshot?.queueKey) ?? empty,
  )
  let party = $derived(
    snapshot?.party.size
      ? `${snapshot.party.size} / ${snapshot.party.maxSize ?? snapshot.party.size}`
      : empty,
  )
  let agent = $derived(presentation?.agentName ?? snapshot?.agentName ?? empty)
  let map = $derived(presentation?.mapName ?? snapshot?.mapName ?? empty)
  let rank = $derived(
    presentation?.rankName ??
      snapshot?.rank?.tierName ??
      (snapshot?.rank?.tier
        ? locale.t("match.tier", { tier: snapshot.rank.tier })
        : locale.t("match.unranked")),
  )
  let rr = $derived(
    snapshot?.rank?.rankedRating != null
      ? `${snapshot.rank.rankedRating} ${locale.t("match.rr")}`
      : empty,
  )
  let region = $derived(
    snapshot?.region ? snapshot.region.toUpperCase() : empty,
  )
</script>

<section
  class="relative flex flex-1 flex-col overflow-hidden rounded-xl border bg-card"
>
  {#if !snapshot}<div
      class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_70_84/0.2),transparent_55%),radial-gradient(circle_at_80%_80%,rgb(17_24_35/0.35),transparent_50%)]"
    ></div>
    <div
      class="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 text-center"
    >
      <AppIcon class="size-10 rounded-lg opacity-80" />
      <div>
        <p class="text-base font-semibold">{locale.t("match.waitingTitle")}</p>
        <p class="text-sm text-muted-foreground">
          {locale.t("match.waitingDescription")}
        </p>
      </div>
    </div>
  {:else}<div class="relative min-h-[16rem] flex-1 overflow-hidden">
      {#if mapUrl}<img
          src={mapUrl}
          alt=""
          class="absolute inset-0 size-full object-cover"
        />{:else}<div
          class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_70_84/0.2),transparent_55%),radial-gradient(circle_at_80%_80%,rgb(17_24_35/0.35),transparent_50%)]"
        ></div>{/if}
      <div
        class="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-background/10 rtl:bg-gradient-to-l"
      ></div>
      <div
        class="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent"
      ></div>
      {#if agentUrl}<img
          src={agentUrl}
          alt={agent}
          class="absolute bottom-0 start-0 h-[105%] max-w-[55%] object-contain object-left-bottom drop-shadow-2xl rtl:object-right-bottom"
        />{/if}{#if isLive}<div
          class="absolute start-4 top-4 flex items-center gap-2 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-lg"
        >
          <span class="size-1.5 animate-pulse rounded-full bg-current"
          ></span>{locale.t("match.live")}
        </div>{/if}{#if standby}<div
          class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <AppIcon class="size-10 rounded-lg opacity-80" />
          <div>
            <p
              class="flex items-center justify-center gap-2 text-base font-semibold"
            >
              <span class="size-1.5 animate-pulse rounded-full bg-success"
              ></span>{standby.title}
            </p>
            <p class="text-sm text-muted-foreground">{standby.subtitle}</p>
          </div>
        </div>{:else}<div
          class="absolute end-6 top-1/2 -translate-y-1/2 text-end"
        >
          <AppIcon
            class="ms-auto size-10 rounded-lg opacity-90"
          />{#if map !== empty}<p
              class="mt-2 text-xs font-medium text-muted-foreground"
            >
              {locale.t("match.mapHeading")}
            </p>
            <p class="text-4xl font-bold text-foreground/90 uppercase">
              {map}
            </p>{/if}
        </div>{/if}
    </div>{/if}
  <div class="relative z-10 border-t bg-card/95">
    <div
      class="grid grid-cols-2 gap-x-2 gap-y-2.5 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6"
    >
      <StatCell label={locale.t("match.player")} value={name} accent
        >{#snippet icon()}<IconUser />{/snippet}</StatCell
      ><StatCell label={locale.t("match.queue")} value={queue}
        >{#snippet icon()}<IconCircleDot />{/snippet}</StatCell
      ><StatCell label={locale.t("match.party")} value={party}
        >{#snippet icon()}<IconUsersGroup />{/snippet}</StatCell
      ><StatCell label={locale.t("match.score")} value={score}
        >{#snippet icon()}<IconSwords />{/snippet}</StatCell
      ><StatCell label={locale.t("match.agent")} value={agent}
        >{#snippet icon()}<IconShield />{/snippet}</StatCell
      ><StatCell label={locale.t("match.map")} value={map}
        >{#snippet icon()}<IconMap2 />{/snippet}</StatCell
      >
    </div>
    <div
      class="grid grid-cols-2 gap-x-2 gap-y-2.5 border-t px-4 py-3 sm:grid-cols-4"
    >
      <StatCell
        label={locale.t("match.phase")}
        value={snapshot ? phaseLabel(snapshot.phase) : empty}
        tone>{#snippet icon()}<IconCircleDot />{/snippet}</StatCell
      ><StatCell label={locale.t("match.rank")} value={rank}
        >{#snippet icon()}{#if rankUrl}<img
              src={rankUrl}
              alt=""
              class="size-5 object-contain"
            />{:else}<IconShield />{/if}{/snippet}</StatCell
      ><StatCell label={locale.t("match.rr")} value={rr}
        >{#snippet icon()}<IconCircleDot />{/snippet}</StatCell
      ><StatCell label={locale.t("match.region")} value={region}
        >{#snippet icon()}<IconWorld />{/snippet}</StatCell
      >
    </div>
  </div>
</section>
