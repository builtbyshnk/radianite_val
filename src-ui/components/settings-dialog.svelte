<script lang="ts">
  import DiscordIcon from "@/components/discord-icon.svelte"
  import IconBroadcast from "@icons-pack/svelte-simple-icons/icons/SiObsstudio"
  import IconCopy from "@solar-icons/svelte/bold/copy"
  import IconExternalLink from "@solar-icons/svelte/bold/square-top-down"
  import IconHeart from "@solar-icons/svelte/bold/heart"
  import IconInfoCircle from "@solar-icons/svelte/bold/info-circle"
  import IconPalette from "@solar-icons/svelte/bold/palette"
  import IconSettings from "@solar-icons/svelte/bold/settings"
  import IconRefresh from "@solar-icons/svelte/bold/refresh"
  import IconShield from "@solar-icons/svelte/bold/shield-check"
  import DonateSettings from "@/components/donate-settings.svelte"
  import UpdatesCard from "@/components/updates-card.svelte"
  import * as Dialog from "@/components/ui/dialog"
  import * as Select from "@/components/ui/select"
  import { Button } from "@/components/ui/button"
  import { ScrollArea } from "@/components/ui/scroll-area"
  import { Switch } from "@/components/ui/switch"
  import { locale } from "@/lib/locale.svelte"
  import { rpcLocales, uiLocales } from "@/lib/i18n"
  import { overlayThemes } from "@/lib/overlay-themes"
  import type {
    DiagnosticSnapshot,
    OverlayStatus,
    RpcStatus,
    SettingKey,
    Settings,
    UpdaterState,
  } from "@/lib/types"
  type Tab =
    | "general"
    | "appearance"
    | "overlay"
    | "discord"
    | "updates"
    | "support"
    | "donate"
    | "about"
  let {
    open = $bindable(),
    onOpenChange,
    settings,
    onSetSetting,
    overlay,
    onCopyOverlay,
    onOpenOverlay,
    busy,
    appVersion,
    onOpenUrl,
    rpc,
    onToggleRpc,
    updater,
    canInstall,
    lastChecked,
    now,
    onCheckUpdate,
    onInstallUpdate,
    diagnostics,
    onRestartMonitor,
    onCopySupportReport,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    settings: Settings
    onSetSetting: <K extends SettingKey>(key: K, value: Settings[K]) => void
    overlay: OverlayStatus
    onCopyOverlay: () => void
    onOpenOverlay: () => void
    busy: boolean
    appVersion: string | null
    onOpenUrl: (url: string) => void
    rpc: RpcStatus
    onToggleRpc: () => void
    updater: UpdaterState
    canInstall: boolean
    lastChecked: Date | null
    now: number
    onCheckUpdate: () => void
    onInstallUpdate: () => void
    diagnostics: DiagnosticSnapshot
    onRestartMonitor: () => void
    onCopySupportReport: () => Promise<void>
  } = $props()
  let active = $state<Tab>("general")
  let copyingReport = $state(false)

  async function copySupportReport() {
    copyingReport = true
    try {
      await onCopySupportReport()
    } finally {
      copyingReport = false
    }
  }

  const nav = [
    { id: "general", key: "settings.nav.general", icon: IconSettings },
    { id: "appearance", key: "settings.nav.appearance", icon: IconPalette },
    { id: "overlay", key: "settings.nav.overlay", icon: IconBroadcast },
    { id: "discord", key: "settings.nav.discord", icon: DiscordIcon },
    { id: "updates", key: "updates.title", icon: IconRefresh },
    { id: "support", key: "settings.supportTitle", icon: IconShield },
    { id: "donate", key: "settings.nav.donate", icon: IconHeart },
    { id: "about", key: "settings.nav.about", icon: IconInfoCircle },
  ] as const
</script>

<Dialog.Root bind:open onOpenChangeComplete={onOpenChange}
  ><Dialog.Content
    class="flex h-[38rem] max-h-[calc(100%-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl sm:flex-row"
    ><Dialog.Title class="sr-only">{locale.t("settings.title")}</Dialog.Title
    ><Dialog.Description class="sr-only"
      >{locale.t("settings.description")}</Dialog.Description
    >
    <nav
      aria-label={locale.t("settings.title")}
      class="me-10 flex shrink-0 gap-1 overflow-x-auto border-b bg-sidebar/60 p-3 sm:me-0 sm:w-52 sm:flex-col sm:overflow-visible sm:border-e sm:border-b-0"
    >
      <span
        class="hidden px-2.5 py-2 text-sm font-medium text-muted-foreground sm:block"
        >{locale.t("settings.title")}</span
      >{#each nav as item}<button
          type="button"
          onclick={() => (active = item.id)}
          aria-current={active === item.id ? "page" : undefined}
          class="flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-start text-xs font-medium text-muted-foreground outline-none transition-colors duration-100 hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/25 aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-foreground"
          ><item.icon title="" aria-hidden="true" class="size-4" />{locale.t(
            item.key,
          )}</button
        >{/each}
    </nav>
    {#key active}<div
        class="flex min-h-0 min-w-0 flex-1 flex-col animate-in fade-in-0 duration-150 ease-out motion-reduce:animate-none"
      >
        {#if active === "donate"}<ScrollArea class="flex-1"
            ><DonateSettings {onOpenUrl} /></ScrollArea
          >{:else}<ScrollArea class="flex-1"
            ><div class="flex flex-col gap-7 p-7">
              {#if active === "general"}{@render Heading(
                  locale.t("settings.nav.general"),
                  locale.t("settings.generalDescription"),
                )}
                <div class="flex flex-col gap-3">
                  {@render LocaleRow(
                    locale.t("settings.appLanguage"),
                    locale.t("settings.appLanguageDescription"),
                    settings.uiLocale,
                    uiLocales,
                    (value) => onSetSetting("uiLocale", value),
                    busy,
                    true,
                  )}{@render SettingRow(
                    locale.t("settings.runAtBoot"),
                    locale.t("settings.runAtBootDescription"),
                    settings.runAtBoot,
                    (value) => onSetSetting("runAtBoot", value),
                  )}{@render SelectRow(
                    locale.t("settings.closeBehavior"),
                    locale.t("settings.closeBehaviorDescription"),
                    settings.lowResourceMode ? "tray" : "quit",
                    [
                      {
                        value: "tray",
                        label: locale.t("settings.closeBehaviorTray"),
                      },
                      {
                        value: "quit",
                        label: locale.t("settings.closeBehaviorQuit"),
                      },
                    ],
                    (value) =>
                      onSetSetting("lowResourceMode", value === "tray"),
                  )}{@render SettingRow(
                    locale.t("settings.rememberWindowState"),
                    locale.t("settings.rememberWindowStateDescription"),
                    settings.rememberWindowState,
                    (value) => onSetSetting("rememberWindowState", value),
                  )}
                </div>
              {:else if active === "appearance"}{@render Heading(
                  locale.t("settings.appearanceTitle"),
                  locale.t("settings.appearanceDescription"),
                )}
                <div class="flex flex-col gap-3">
                  {@render SelectRow(
                    locale.t("settings.interfaceScale"),
                    locale.t("settings.interfaceScaleDescription"),
                    settings.interfaceScale,
                    [
                      {
                        value: "compact",
                        label: locale.t("settings.interfaceScaleCompact"),
                      },
                      {
                        value: "default",
                        label: locale.t("settings.interfaceScaleDefault"),
                      },
                      {
                        value: "comfortable",
                        label: locale.t("settings.interfaceScaleComfortable"),
                      },
                    ],
                    (value) =>
                      onSetSetting(
                        "interfaceScale",
                        value as Settings["interfaceScale"],
                      ),
                  )}{@render SettingRow(
                    locale.t("settings.reduceMotion"),
                    locale.t("settings.reduceMotionDescription"),
                    settings.reduceMotion,
                    (value) => onSetSetting("reduceMotion", value),
                  )}
                </div>
              {:else if active === "overlay"}{@render Heading(
                  locale.t("overlay.title"),
                  locale.t("settings.overlayDescription"),
                )}
                <div class="flex flex-col gap-3">
                  <div>
                    <p class="mb-1 text-xs text-muted-foreground">
                      {locale.t("overlay.sourceUrl")}
                    </p>
                    <code
                      class="block w-full truncate rounded-md border bg-background/60 px-2.5 py-1.5 font-mono text-xs"
                      >{overlay.url ?? locale.t("overlay.notRunning")}</code
                    >
                  </div>
                  <div class="flex gap-2">
                    <Button
                      variant="outline"
                      onclick={onCopyOverlay}
                      disabled={!overlay.url}
                      ><IconCopy data-icon="inline-start" />{locale.t(
                        "overlay.copyUrl",
                      )}</Button
                    ><Button
                      variant="outline"
                      onclick={onOpenOverlay}
                      disabled={!overlay.url}
                      ><IconExternalLink data-icon="inline-start" />{locale.t(
                        "common.open",
                      )}</Button
                    >
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {locale.t("overlay.suggestedSize")}
                    <span class="font-mono text-foreground">720 × 200</span>
                  </p>
                  {@render SelectRow(
                    locale.t("overlay.theme"),
                    locale.t("settings.overlayThemeDescription"),
                    settings.overlayTheme,
                    overlayThemes.map((theme) => ({
                      value: theme.id,
                      label: theme.name,
                    })),
                    (value) => onSetSetting("overlayTheme", value),
                  )}
                  {@render SettingRow(
                    locale.t("settings.overlayHideDetails"),
                    locale.t("settings.overlayHideDetailsDescription"),
                    settings.overlayHideDetails,
                    (value) => onSetSetting("overlayHideDetails", value),
                  )}
                </div>
              {:else if active === "discord"}{@render Heading(
                  locale.t("settings.rpcTitle"),
                  locale.t("settings.rpcDescription"),
                )}
                <div class="flex flex-col gap-3">
                  {@render SettingRow(
                    locale.t("settings.rpcEnabled"),
                    locale.t("settings.rpcEnabledDescription"),
                    rpc.enabled,
                    onToggleRpc,
                    busy || !rpc.configured,
                  )}
                  {@render LocaleRow(
                    locale.t("settings.rpcLanguage"),
                    locale.t("settings.rpcLanguageDescription"),
                    settings.rpcLocale,
                    rpcLocales,
                    (value) => onSetSetting("rpcLocale", value),
                    busy,
                  )}{@render SettingRow(
                    locale.t("settings.enableRpcOnStart"),
                    locale.t("settings.enableRpcOnStartDescription"),
                    settings.enableRpcOnStart,
                    (value) => onSetSetting("enableRpcOnStart", value),
                  )}
                  {@render SettingRow(
                    locale.t("settings.rpcHideRank"),
                    locale.t("settings.rpcHideRankDescription"),
                    settings.rpcHideRank,
                    (value) => onSetSetting("rpcHideRank", value),
                  )}
                  {@render SettingRow(
                    locale.t("settings.rpcHideParty"),
                    locale.t("settings.rpcHidePartyDescription"),
                    settings.rpcHideParty,
                    (value) => onSetSetting("rpcHideParty", value),
                  )}
                  {@render SettingRow(
                    locale.t("settings.rpcHideElapsed"),
                    locale.t("settings.rpcHideElapsedDescription"),
                    settings.rpcHideElapsed,
                    (value) => onSetSetting("rpcHideElapsed", value),
                  )}
                </div>
              {:else if active === "updates"}{@render Heading(
                  locale.t("updates.title"),
                  locale.t("settings.updatesDescription"),
                )}
                {@render SettingRow(
                  locale.t("settings.automaticUpdateChecks"),
                  locale.t("settings.automaticUpdateChecksDescription"),
                  settings.automaticUpdateChecks,
                  (value) => onSetSetting("automaticUpdateChecks", value),
                )}
                <UpdatesCard
                  {updater}
                  version={appVersion}
                  {canInstall}
                  {lastChecked}
                  {now}
                  onCheck={onCheckUpdate}
                  onInstall={onInstallUpdate}
                />
              {:else if active === "support"}{@render Heading(
                  locale.t("settings.supportTitle"),
                  locale.t("settings.supportDescription"),
                )}
                <dl class="rounded-lg border bg-background/40 px-4">
                  {@render StatusRow(
                    locale.t("quickInfo.tracking"),
                    diagnostics.status.monitored,
                  )}
                  {@render StatusRow(
                    locale.t("core.riotConnected"),
                    diagnostics.localApiReady,
                  )}
                  {@render StatusRow(locale.t("discord.title"), rpc.connected)}
                  {@render StatusRow(
                    locale.t("quickInfo.overlay"),
                    overlay.enabled,
                  )}
                </dl>
                <div class="flex flex-col gap-3">
                  <div>
                    <h3 class="text-xs font-medium">
                      {locale.t("settings.restartMonitor")}
                    </h3>
                    <p class="mt-1 text-xs text-muted-foreground">
                      {locale.t("settings.restartMonitorDescription")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    class="self-start"
                    onclick={onRestartMonitor}
                    disabled={busy}
                  >
                    <IconRefresh data-icon="inline-start" />{locale.t(
                      "settings.restartMonitor",
                    )}
                  </Button>
                </div>
                <div class="flex flex-col gap-3">
                  <div>
                    <h3 class="text-xs font-medium">
                      {locale.t("settings.supportReport")}
                    </h3>
                    <p class="mt-1 text-xs text-muted-foreground">
                      {locale.t("settings.supportReportDescription")}
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onclick={copySupportReport}
                      disabled={copyingReport}
                      aria-busy={copyingReport}
                    >
                      <IconCopy data-icon="inline-start" />{locale.t(
                        "settings.copySupportReport",
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onclick={() =>
                        onOpenUrl(
                          "https://github.com/builtbyshnk/radianite_val/issues",
                        )}
                    >
                      <IconExternalLink data-icon="inline-start" />{locale.t(
                        "settings.reportIssue",
                      )}
                    </Button>
                  </div>
                </div>
              {:else}{@render Heading(
                  locale.t("settings.aboutTitle"),
                  locale.t("settings.aboutDescription"),
                )}
                <dl class="flex flex-col gap-2.5 text-xs">
                  <div
                    class="flex items-center justify-between rounded-lg border bg-background/40 px-4 py-3"
                  >
                    <dt class="text-muted-foreground">
                      {locale.t("settings.version")}
                    </dt>
                    <dd class="font-mono">
                      v{appVersion ?? locale.t("common.notAvailable")}
                    </dd>
                  </div>
                  <div
                    class="flex items-center justify-between rounded-lg border bg-background/40 px-4 py-3"
                  >
                    <dt class="text-muted-foreground">
                      {locale.t("settings.license")}
                    </dt>
                    <dd class="font-mono">GPL-3.0-only</dd>
                  </div>
                </dl>
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    onclick={() =>
                      onOpenUrl("https://github.com/builtbyshnk/radianite_val")}
                    ><IconExternalLink data-icon="inline-start" />{locale.t(
                      "settings.repository",
                    )}</Button
                  ><Button
                    variant="outline"
                    onclick={() =>
                      onOpenUrl("https://get.radcolor.dev/radianite")}
                    ><IconExternalLink data-icon="inline-start" />{locale.t(
                      "settings.website",
                    )}</Button
                  >
                </div>{/if}
            </div></ScrollArea
          >{/if}
      </div>{/key}
  </Dialog.Content></Dialog.Root
>

{#snippet Heading(title: string, description: string)}<div
    class="flex flex-col gap-1.5"
  >
    <h2 class="font-heading text-base font-medium">{title}</h2>
    <p class="text-xs text-muted-foreground">{description}</p>
  </div>{/snippet}
{#snippet SettingRow(
  title: string,
  description: string,
  checked: boolean,
  onchange: (value: boolean) => void,
  disabled = busy,
)}<label
    class:cursor-pointer={!disabled}
    class:cursor-not-allowed={disabled}
    class:opacity-50={disabled}
    class="flex items-center justify-between gap-4 border-b px-1 py-4 last:border-b-0"
    ><span class="flex flex-col gap-1"
      ><span class="text-xs font-medium">{title}</span><span
        class="text-xs text-muted-foreground">{description}</span
      ></span
    ><Switch
      {checked}
      onCheckedChange={onchange}
      {disabled}
      aria-label={title}
    /></label
  >{/snippet}
{#snippet SelectRow(
  title: string,
  description: string,
  value: string,
  options: Array<{ value: string; label: string }>,
  onchange: (value: string) => void,
)}<div
    class="flex flex-col items-start justify-between gap-4 border-b px-1 py-4 last:border-b-0 sm:flex-row sm:items-center"
  >
    <span class="flex flex-col gap-1"
      ><span class="text-xs font-medium">{title}</span><span
        class="text-xs text-muted-foreground">{description}</span
      ></span
    ><Select.Root type="single" {value} onValueChange={onchange} disabled={busy}
      ><Select.Trigger class="w-full min-w-36 sm:w-auto" aria-label={title}
        ><span data-slot="select-value" class="flex-1 text-start"
          >{options.find((option) => option.value === value)?.label}</span
        ></Select.Trigger
      ><Select.Content align="end"
        ><Select.Group
          >{#each options as option}<Select.Item value={option.value}
              >{option.label}</Select.Item
            >{/each}</Select.Group
        ></Select.Content
      ></Select.Root
    >
  </div>{/snippet}
{#snippet LocaleRow(
  title: string,
  description: string,
  value: string,
  options: typeof uiLocales,
  onchange: (value: string) => void,
  disabled = false,
  allowSystem = false,
)}<div
    class="flex flex-col items-start justify-between gap-4 border-b px-1 py-4 last:border-b-0 sm:flex-row sm:items-center"
  >
    <span class="flex flex-col gap-1"
      ><span class="text-xs font-medium">{title}</span><span
        class="text-xs text-muted-foreground">{description}</span
      ></span
    ><Select.Root type="single" {value} onValueChange={onchange} {disabled}
      ><Select.Trigger
        class="w-full min-w-44 shrink-0 sm:w-auto"
        aria-label={title}
        ><span data-slot="select-value" class="flex-1 text-start"
          >{value === "system"
            ? locale.t("settings.systemLanguage")
            : options.find((o) => o.tag === value)?.nativeName}</span
        ></Select.Trigger
      ><Select.Content align="end"
        ><Select.Group
          >{#if allowSystem}<Select.Item value="system"
              >{locale.t("settings.systemLanguage")}</Select.Item
            >{/if}{#each options as option}<Select.Item value={option.tag}
              ><bdi lang={option.tag}>{option.nativeName}</bdi></Select.Item
            >{/each}</Select.Group
        ></Select.Content
      ></Select.Root
    >
  </div>{/snippet}

{#snippet StatusRow(title: string, ready: boolean)}
  <div
    class="flex items-center justify-between gap-4 border-b py-3 text-xs last:border-b-0"
  >
    <dt class="text-muted-foreground">{title}</dt>
    <dd class={ready ? "text-success" : "text-muted-foreground"}>
      {locale.t(ready ? "common.active" : "common.off")}
    </dd>
  </div>
{/snippet}
