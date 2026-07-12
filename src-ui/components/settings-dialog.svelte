<script lang="ts">
  import IconBrandDiscord from "@tabler/icons-svelte/icons/brand-discord"
  import IconBroadcast from "@tabler/icons-svelte/icons/broadcast"
  import IconCopy from "@tabler/icons-svelte/icons/copy"
  import IconExternalLink from "@tabler/icons-svelte/icons/external-link"
  import IconHeart from "@tabler/icons-svelte/icons/heart"
  import IconInfoCircle from "@tabler/icons-svelte/icons/info-circle"
  import IconPalette from "@tabler/icons-svelte/icons/palette"
  import IconSettings from "@tabler/icons-svelte/icons/settings"
  import * as Dialog from "@/components/ui/dialog"
  import * as Select from "@/components/ui/select"
  import { Button } from "@/components/ui/button"
  import { ScrollArea } from "@/components/ui/scroll-area"
  import { Switch } from "@/components/ui/switch"
  import { locale } from "@/lib/locale.svelte"
  import { rpcLocales, uiLocales } from "@/lib/i18n"
  import type { OverlayStatus, SettingKey, Settings } from "@/lib/types"
  type Tab =
    "general" | "appearance" | "overlay" | "discord" | "donate" | "about"
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
  } = $props()
  let active = $state<Tab>("general")
  const nav = [
    { id: "general", key: "settings.nav.general", icon: IconSettings },
    { id: "appearance", key: "settings.nav.appearance", icon: IconPalette },
    { id: "overlay", key: "settings.nav.overlay", icon: IconBroadcast },
    { id: "discord", key: "settings.nav.discord", icon: IconBrandDiscord },
    { id: "donate", key: "settings.nav.donate", icon: IconHeart },
    { id: "about", key: "settings.nav.about", icon: IconInfoCircle },
  ] as const
  $effect(() => onOpenChange(open))
</script>

<Dialog.Root bind:open
  ><Dialog.Content
    class="flex h-[38rem] max-h-[calc(100%-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl sm:flex-row"
    ><Dialog.Title class="sr-only">{locale.t("settings.title")}</Dialog.Title
    ><Dialog.Description class="sr-only"
      >{locale.t("settings.description")}</Dialog.Description
    >
    <nav
      class="flex shrink-0 gap-1 overflow-x-auto border-b bg-sidebar/60 p-3 sm:w-52 sm:flex-col sm:overflow-visible sm:border-e sm:border-b-0"
    >
      <span
        class="hidden px-2.5 py-2 text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase sm:block"
        >{locale.t("settings.title")}</span
      >{#each nav as item}<button
          type="button"
          onclick={() => (active = item.id)}
          class:bg-sidebar-accent={active === item.id}
          class:text-foreground={active === item.id}
          class="flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-start text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-foreground"
          ><item.icon class="size-4" />{locale.t(item.key)}</button
        >{/each}
    </nav>
    <div class="flex min-w-0 flex-1 flex-col">
      {#if active === "donate"}<iframe
          title={locale.t("settings.supportTitle")}
          src="https://radcolor.dev/donate"
          class="page-transition size-full border-0 bg-background"
        ></iframe>{:else}<ScrollArea class="page-transition flex-1"
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
                )}{@render SettingRow(
                  locale.t("settings.runAtBoot"),
                  locale.t("settings.runAtBootDescription"),
                  settings.runAtBoot,
                  (value) => onSetSetting("runAtBoot", value),
                )}{@render SettingRow(
                  locale.t("settings.startMinimized"),
                  locale.t("settings.startMinimizedDescription"),
                  settings.startMinimized,
                  (value) => onSetSetting("startMinimized", value),
                  !settings.runAtBoot,
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
                  (value) => onSetSetting("lowResourceMode", value === "tray"),
                )}{@render SettingRow(
                  locale.t("settings.automaticUpdateChecks"),
                  locale.t("settings.automaticUpdateChecksDescription"),
                  settings.automaticUpdateChecks,
                  (value) => onSetSetting("automaticUpdateChecks", value),
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
                    title={overlay.url
                      ? locale.t("overlay.copyUrl")
                      : locale.t("overlay.notRunning")}
                    ><IconCopy data-icon="inline-start" />{locale.t(
                      "overlay.copyUrl",
                    )}</Button
                  ><Button
                    variant="outline"
                    onclick={onOpenOverlay}
                    disabled={!overlay.url}
                    title={overlay.url
                      ? locale.t("common.open")
                      : locale.t("overlay.notRunning")}
                    ><IconExternalLink data-icon="inline-start" />{locale.t(
                      "common.open",
                    )}</Button
                  >
                </div>
                <p class="text-xs text-muted-foreground">
                  {locale.t("overlay.suggestedSize")}
                  <span class="font-mono text-foreground">720 × 200</span>
                </p>
              </div>
            {:else if active === "discord"}{@render Heading(
                locale.t("settings.rpcTitle"),
                locale.t("settings.rpcDescription"),
              )}
              <div class="flex flex-col gap-3">
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
                  onclick={() => onOpenUrl("https://builtbyshnk.github.io/radianite_val/")}
                  ><IconExternalLink data-icon="inline-start" />{locale.t(
                    "settings.website",
                  )}</Button
                >
              </div>{/if}
          </div></ScrollArea
        >{/if}
    </div>
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
  disabled = false,
)}<label
    class:cursor-pointer={!disabled}
    class:cursor-not-allowed={disabled}
    class:opacity-50={disabled}
    class="flex items-center justify-between gap-4 rounded-lg border bg-background/40 px-4 py-3.5"
    ><span class="flex flex-col gap-1"
      ><span class="text-xs font-medium">{title}</span><span
        class="text-xs text-muted-foreground">{description}</span
      ></span
    ><Switch {checked} onCheckedChange={onchange} {disabled} /></label
  >{/snippet}
{#snippet SelectRow(
  title: string,
  description: string,
  value: string,
  options: Array<{ value: string; label: string }>,
  onchange: (value: string) => void,
)}<div
    class="flex items-center justify-between gap-4 rounded-lg border bg-background/40 px-4 py-3.5"
  >
    <span class="flex flex-col gap-1"
      ><span class="text-xs font-medium">{title}</span><span
        class="text-xs text-muted-foreground">{description}</span
      ></span
    ><Select.Root type="single" {value} onValueChange={onchange}
      ><Select.Trigger class="min-w-36" aria-label={title}
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
)}<div
    class="flex items-center justify-between gap-4 rounded-lg border bg-background/40 px-4 py-3.5"
  >
    <span class="flex flex-col gap-1"
      ><span class="text-xs font-medium">{title}</span><span
        class="text-xs text-muted-foreground">{description}</span
      ></span
    ><Select.Root type="single" {value} onValueChange={onchange} {disabled}
      ><Select.Trigger class="min-w-44" aria-label={title}
        ><span data-slot="select-value" class="flex-1 text-start"
          >{options.find((o) => o.tag === value)?.nativeName}</span
        ></Select.Trigger
      ><Select.Content align="end"
        ><Select.Group
          >{#each options as option}<Select.Item value={option.tag}
              >{option.nativeName}</Select.Item
            >{/each}</Select.Group
        ></Select.Content
      ></Select.Root
    >
  </div>{/snippet}
