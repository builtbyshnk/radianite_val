<script lang="ts">
  import IconQueue from "@solar-icons/svelte/bold/gamepad"
  import IconPhase from "@solar-icons/svelte/bold/hourglass"
  import IconRating from "@solar-icons/svelte/bold/chart-2"
  import IconRank from "@solar-icons/svelte/bold/medal-star"
  import IconMap2 from "@solar-icons/svelte/bold/map"
  import IconAgent from "@solar-icons/svelte/bold/user-id"
  import IconScore from "@solar-icons/svelte/bold/cup"
  import IconUser from "@solar-icons/svelte/bold/user"
  import IconUsersGroup from "@solar-icons/svelte/bold/users-group-rounded"
  import IconWorld from "@solar-icons/svelte/bold/globe"
  import AppIcon from "@/components/app-icon.svelte"
  import StatCell from "@/components/stat-cell.svelte"
  import { phaseLabel, queueLabel, regionLabel } from "@/lib/format"
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
  let name = $derived(snapshot?.player.gameName ?? empty)
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
  let wideMap = $derived(/[^\u0020-\u024f]/.test(map))
  let mapSize = $derived(
    `${Math.min(24, (wideMap ? 84 : 123) / Array.from(map).length)}cqw`,
  )
  let bylineSize = $derived(
    `${Math.min(4.8, 58 / (Array.from(name).length + Array.from(agent).length + 3))}cqw`,
  )
  let rank = $derived(
    presentation?.rankName ??
      snapshot?.rank?.tierName ??
      (snapshot?.rank?.tier
        ? locale.t("match.tier", { tier: snapshot.rank.tier })
        : locale.t("match.unranked")),
  )
  let rr = $derived(
    snapshot?.rank?.rankedRating != null
      ? `${snapshot.rank.rankedRating}`
      : empty,
  )
  let region = $derived(regionLabel(snapshot?.region) ?? empty)
</script>

<section
  class:match-cover={isLive}
  class="relative flex flex-1 flex-col overflow-hidden rounded-lg border bg-card"
>
  {#if !snapshot}<div class="absolute inset-0 bg-card"></div>
    <div
      class="relative z-10 flex min-h-44 flex-1 flex-col items-center justify-center gap-3 text-center"
    >
      <AppIcon class="size-10 rounded-lg opacity-80" />
      <div>
        <p class="text-base font-semibold">{locale.t("match.waitingTitle")}</p>
        <p class="text-sm text-muted-foreground">
          {locale.t("match.waitingDescription")}
        </p>
      </div>
    </div>
  {:else if isLive}<div class="match-spread">
      {#if mapUrl}<img class="cover-map" src={mapUrl} alt="" />{/if}
      <h2 class="cover-title" style:--map-size={mapSize}>
        {map}
      </h2>
      {#if agentUrl}<img class="cover-agent" src={agentUrl} alt={agent} />{/if}
      <div class="cover-live">
        <span></span>{locale.t("match.live")}
      </div>
      <div class="cover-story">
        <p class="cover-byline" style:font-size={bylineSize}>
          <span title={name}>{name}</span><span class="cover-cross">×</span
          ><span title={agent}>{agent}</span>
        </p>
        <div class="cover-score-panel">
          <p
            class="cover-score"
            style:font-size={`${Math.min(12, 50 / score.replace(/ /g, "").length)}cqw`}
            aria-label={`${locale.t("match.score")}: ${score}`}
            dir="ltr"
          >
            {score}
          </p>
          <dl class="cover-facts">
            <div class="cover-rank">
              <dt class="sr-only">{locale.t("match.rank")}</dt>
              <dd title={rank}>
                {#if rankUrl}<img src={rankUrl} alt="" />{:else}<IconRank
                  />{/if}
                <span>{rank}</span>
              </dd>
            </div>
            <div>
              <dt class="sr-only">{locale.t("match.rr")}</dt>
              <dd dir="ltr">{rr} <span>RR</span></dd>
            </div>
            <div class="cover-region">
              <dt class="sr-only">{locale.t("match.region")}</dt>
              <dd title={region}><IconWorld /><span>{region}</span></dd>
            </div>
          </dl>
        </div>
      </div>
      <dl class="cover-context">
        <div>
          <dt class="sr-only">{locale.t("match.queue")}</dt>
          <dd>{queue}</dd>
        </div>
        <div>
          <dt>{locale.t("match.party")}</dt>
          <dd dir="ltr">{party}</dd>
        </div>
        <div>
          <dt class="sr-only">{locale.t("match.phase")}</dt>
          <dd>{phaseLabel(snapshot.phase)}</dd>
        </div>
      </dl>
    </div>
  {:else}<div class="relative min-h-[16rem] flex-1 overflow-hidden">
      {#if mapUrl}<img
          src={mapUrl}
          alt=""
          class="absolute inset-0 size-full object-cover"
        />{:else}<div class="absolute inset-0 bg-card"></div>{/if}
      <div
        class="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-background/10 rtl:bg-gradient-to-l"
      ></div>
      <div
        class="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent"
      ></div>
      {#if agentUrl}<img
          src={agentUrl}
          alt={agent}
          class="absolute bottom-0 start-0 h-[105%] max-w-[55%] object-contain object-left-bottom rtl:object-right-bottom"
        />{/if}{#if standby}<div
          class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <AppIcon class="size-10 rounded-lg opacity-80" />
          <div>
            <p
              class="flex items-center justify-center gap-2 text-base font-semibold"
            >
              <span class="size-1.5 rounded-full bg-success"
              ></span>{standby.title}
            </p>
            <p class="text-sm text-muted-foreground">{standby.subtitle}</p>
          </div>
        </div>{/if}
    </div>{/if}
  {#if !isLive}<div class="relative z-10 border-t bg-card/95">
      <div
        class="grid grid-cols-2 gap-x-2 gap-y-2.5 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        <StatCell label={locale.t("match.player")} value={name} accent
          >{#snippet icon()}<IconUser />{/snippet}</StatCell
        ><StatCell label={locale.t("match.queue")} value={queue}
          >{#snippet icon()}<IconQueue />{/snippet}</StatCell
        ><StatCell label={locale.t("match.party")} value={party}
          >{#snippet icon()}<IconUsersGroup />{/snippet}</StatCell
        ><StatCell label={locale.t("match.score")} value={score}
          >{#snippet icon()}<IconScore />{/snippet}</StatCell
        ><StatCell label={locale.t("match.agent")} value={agent}
          >{#snippet icon()}<IconAgent />{/snippet}</StatCell
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
          tone>{#snippet icon()}<IconPhase />{/snippet}</StatCell
        ><StatCell label={locale.t("match.rank")} value={rank}
          >{#snippet icon()}{#if rankUrl}<img
                src={rankUrl}
                alt=""
                class="size-5 object-contain"
              />{:else}<IconRank />{/if}{/snippet}</StatCell
        ><StatCell label={locale.t("match.rr")} value={rr}
          >{#snippet icon()}<IconRating />{/snippet}</StatCell
        ><StatCell label={locale.t("match.region")} value={region}
          >{#snippet icon()}<IconWorld />{/snippet}</StatCell
        >
      </div>
    </div>{/if}
</section>

<style>
  .match-cover {
    container-type: inline-size;
    align-self: stretch;
    color: #f5ecd9;
    background: #262321;
  }

  .match-spread {
    position: relative;
    isolation: isolate;
    flex: 1;
    aspect-ratio: 16 / 9;
    overflow: hidden;
  }

  .cover-map {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: sepia(0.25) saturate(0.9) brightness(1.05);
  }

  .cover-title,
  .cover-byline,
  .cover-score,
  .cover-facts {
    font-family: "Lexend Variable", system-ui, sans-serif;
    font-weight: 800;
    letter-spacing: 0.035em;
    text-transform: uppercase;
  }

  .cover-title {
    position: absolute;
    inset-block-start: 2.5%;
    inset-inline: 3.5%;
    font-size: var(--map-size);
    line-height: 0.9;
    text-align: center;
    white-space: nowrap;
    text-shadow: 0 1px 12px rgb(25 20 18 / 10%);
  }

  .cover-agent {
    position: absolute;
    z-index: 1;
    top: -21%;
    inset-inline-start: -46%;
    height: 240%;
    width: auto;
    max-width: none;
    filter: drop-shadow(0 0.6cqw 1cqw rgb(24 18 13 / 25%));
  }

  .cover-live {
    position: absolute;
    z-index: 2;
    inset-block-start: 2.3%;
    inset-inline-end: 0;
    display: flex;
    align-items: center;
    gap: 0.8cqw;
    max-width: 48%;
    padding: 0.6cqw 1.8cqw;
    background: var(--primary);
    color: var(--primary-foreground);
    font-size: clamp(9px, 1.7cqw, 14px);
    font-weight: 800;
    line-height: 1.3;
    letter-spacing: 0.055em;
  }

  .cover-live > span {
    width: 0.7em;
    height: 0.7em;
    flex-shrink: 0;
    border-radius: 50%;
    background: currentColor;
  }

  .cover-story {
    position: absolute;
    z-index: 2;
    inset-block-end: 0;
    inset-inline-end: 0;
    width: 50%;
  }

  .cover-byline {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.4cqw;
    margin-block-end: 1.8cqw;
    margin-inline: 3cqw;
    padding-block-end: 1.2cqw;
    border-block-end: 2px solid #ff6572;
    line-height: 1.3;
    white-space: nowrap;
    text-shadow: 0 2px 10px rgb(15 12 10 / 80%);
  }

  .cover-byline > span:not(.cover-cross) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cover-cross {
    flex-shrink: 0;
    color: #ff6572;
    font-size: 0.85em;
  }

  .cover-score-panel {
    position: relative;
    isolation: isolate;
    padding-block: 0.6cqw 1cqw;
    padding-inline: 3cqw;
    color: #252321;
  }

  .cover-score-panel::before {
    position: absolute;
    z-index: -1;
    inset-block: 0;
    inset-inline: -6cqw 0;
    background: #f5ecd9;
    clip-path: polygon(15% 0, 100% 0, 100% 100%, 0 100%);
    content: "";
  }

  .cover-score {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 10cqw;
    line-height: 1.15;
    letter-spacing: 0.02em;
    text-align: center;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .cover-facts {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1cqw;
    margin-block-start: 0.8cqw;
    padding-block-start: 0.8cqw;
    border-block-start: 1px solid rgb(37 35 33 / 65%);
    font-size: clamp(9px, 1.3cqw, 12px);
    line-height: 1.4;
    text-align: center;
  }

  .cover-facts > div {
    min-width: 0;
  }

  .cover-facts > div + div {
    padding-inline-start: 1cqw;
    border-inline-start: 1px solid rgb(37 35 33 / 45%);
  }

  .cover-facts dd {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6cqw;
    white-space: nowrap;
  }

  .cover-facts dd > span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cover-rank img,
  .cover-facts :global(svg) {
    width: 2.3cqw;
    height: 2.3cqw;
    flex-shrink: 0;
    object-fit: contain;
  }

  .cover-context {
    position: absolute;
    z-index: 2;
    inset-block-end: 1.6cqw;
    inset-inline-start: 2.5cqw;
    display: flex;
    flex-wrap: wrap;
    gap: 0.2cqw 1cqw;
    max-width: 39%;
    font-size: clamp(9px, 1.35cqw, 11px);
    line-height: 1.5;
    text-shadow:
      0 1px 5px #000,
      0 1px 12px #000;
  }

  .cover-context > div {
    display: flex;
    gap: 0.5cqw;
  }

  .cover-context > div + div {
    padding-inline-start: 1cqw;
    border-inline-start: 1px solid rgb(245 236 217 / 45%);
  }

  :global([dir="rtl"]) .cover-score-panel::before {
    clip-path: polygon(0 0, 85% 0, 100% 100%, 0 100%);
  }

  @container (max-width: 480px) {
    .cover-title {
      font-size: min(19cqw, var(--map-size));
    }

    .cover-story {
      width: 54%;
    }

    .cover-facts {
      flex-wrap: wrap;
      justify-content: center;
    }

    .cover-facts > .cover-region {
      width: 100%;
      padding-inline-start: 0;
      border-inline-start: 0;
    }

    .cover-context > div:last-child {
      width: 100%;
      padding-inline-start: 0;
      border-inline-start: 0;
    }
  }
</style>
