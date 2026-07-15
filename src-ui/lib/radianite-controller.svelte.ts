import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater"
import { toast } from "svelte-sonner"

import i18n, { applyUiLocale, detectedLocale } from "@/lib/i18n"
import type { OverlayTheme } from "@/lib/overlay-themes"
import { tauriClient, type RadianiteClient } from "@/lib/radianite-client"
import type {
  AppSnapshot,
  CoreStatus,
  DiagnosticSnapshot,
  LiveSnapshot,
  LocalizedMessage,
  OverlayStatus,
  RpcStatus,
  SettingKey,
  Settings,
  UpdaterState,
  ValorantPresentation,
} from "@/lib/types"

const message = (
  key: string,
  args?: Record<string, string | number>,
  detail?: string,
): LocalizedMessage => ({ key, args, detail })
const initialStatus: CoreStatus = {
  kind: "disconnected",
  message: message("status.message.notStarted"),
  monitored: false,
  updatedAt: "",
}
const initialDiagnostics: DiagnosticSnapshot = {
  status: initialStatus,
  riotInstallsJsonExists: false,
  lockfileExists: false,
  lockfilePortPresent: false,
  localApiReady: false,
  sessionProductIds: [],
  valorantSessionPresent: false,
  puuidPresent: false,
  accessTokenReady: false,
  entitlementTokenReady: false,
  updatedAt: "",
}
const initialRpc: RpcStatus = {
  enabled: false,
  connected: false,
  configured: false,
  message: message("status.rpc.notLoaded"),
  locale: "en-US",
  preview: null,
  updatedAt: "",
}
const initialOverlay: OverlayStatus = {
  enabled: false,
  url: null,
  port: null,
  message: message("status.overlay.notLoaded"),
  updatedAt: "",
}
const initialUpdater: UpdaterState = {
  status: "idle",
  message: message("updates.state.idle"),
  progress: null,
}
const defaultSettings: Settings = {
  runAtBoot: false,
  startMinimized: false,
  automaticUpdateChecks: false,
  reduceMotion: false,
  interfaceScale: "default",
  rememberWindowState: false,
  lowResourceMode: true,
  enableRpcOnStart: true,
  overlayTheme: "nightfall",
  overlayHideDetails: false,
  uiLocale: detectedLocale("ui"),
  rpcLocale: detectedLocale("rpc"),
}
type SettingsBootstrap = { settings: Settings; rpcStatus: RpcStatus }

export class RadianiteController {
  diagnostics = $state<DiagnosticSnapshot>(initialDiagnostics)
  snapshot = $state<LiveSnapshot | null>(null)
  presentation = $state<ValorantPresentation | null>(null)
  rpcStatus = $state<RpcStatus>(initialRpc)
  overlayStatus = $state<OverlayStatus>(initialOverlay)
  overlayTheme = $state<OverlayTheme>("nightfall")
  updater = $state<UpdaterState>(initialUpdater)
  availableUpdate = $state.raw<Update | null>(null)
  busy = $state(false)
  appVersion = $state<string | null>(null)
  lastSync = $state<Date | null>(null)
  lastChecked = $state<Date | null>(null)
  now = $state(Date.now())
  readonly startedAt = Date.now()
  settings = $state<Settings>(defaultSettings)
  backendReady = $state(false)
  settingsReady = $state(false)
  unlisteners: Array<() => void> = []
  timer: ReturnType<typeof setInterval> | null = null
  active = false
  presentationRequest = 0
  presentationKey: string | null = null
  visibilityHandler = () => this.syncClock()

  constructor(private client: RadianiteClient = tauriClient) {}
  get initializing() {
    return !this.backendReady || !this.settingsReady
  }

  async initialize() {
    this.active = true
    document.addEventListener("visibilitychange", this.visibilityHandler)
    this.syncClock()
    await Promise.allSettled([
      this.initializeBackend(),
      this.initializeSettings(),
    ])
    if (this.active && this.settings.automaticUpdateChecks)
      void this.checkForUpdate(true)
  }

  destroy() {
    this.active = false
    this.presentationRequest += 1
    this.unlisteners.splice(0).forEach((unlisten) => unlisten())
    document.removeEventListener("visibilitychange", this.visibilityHandler)
    this.stopClock()
  }

  private syncClock() {
    if (!this.active || document.hidden) {
      this.stopClock()
      return
    }
    this.now = Date.now()
    if (!this.timer)
      this.timer = setInterval(() => {
        this.now = Date.now()
      }, 1000)
  }

  private stopClock() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private async initializeBackend() {
    try {
      const listeners = await Promise.all([
        this.client.listen<CoreStatus>("riot:status", (status) => {
          this.diagnostics = { ...this.diagnostics, status }
        }),
        this.client.listen<DiagnosticSnapshot>(
          "riot:diagnostics",
          (diagnostics) => {
            this.diagnostics = diagnostics
          },
        ),
        this.client.listen<LiveSnapshot | null>("riot:snapshot", (snapshot) => {
          this.snapshot = snapshot
          this.lastSync = new Date()
          void this.loadPresentation()
        }),
        this.client.listen<RpcStatus>("discord:status", (status) => {
          this.rpcStatus = status
        }),
      ])
      if (!this.active) {
        listeners.forEach((unlisten) => unlisten())
        return
      }
      this.unlisteners.push(...listeners)
      void this.client
        .getVersion()
        .then((version) => {
          if (this.active) this.appVersion = version
        })
        .catch(() => {
          if (this.active) this.appVersion = null
        })
      await this.refresh()
    } catch (error) {
      if (this.active) toast.error(errorText(error))
    } finally {
      if (this.active) this.backendReady = true
    }
  }

  private async initializeSettings() {
    try {
      const result = await this.client.invoke<SettingsBootstrap>(
        "settings_initialize",
        {
          defaultUiLocale: defaultSettings.uiLocale,
          defaultRpcLocale: defaultSettings.rpcLocale,
        },
      )
      await applyUiLocale(result.settings.uiLocale)
      if (this.active) {
        this.settings = result.settings
        applyInterfacePreferences(result.settings)
        this.overlayTheme = result.settings.overlayTheme as OverlayTheme
        this.rpcStatus = result.rpcStatus
      }
    } catch (error) {
      if (this.active) toast.error(errorText(error))
    } finally {
      if (this.active) this.settingsReady = true
    }
  }

  async refresh() {
    const next = await this.client.invoke<AppSnapshot>("app_get_snapshot")
    this.diagnostics = next.diagnostics
    this.snapshot = next.liveSnapshot
    this.rpcStatus = next.rpcStatus
    this.overlayStatus = next.overlayStatus
    this.lastSync = new Date()
    await this.loadPresentation()
  }

  private async run(operation: () => Promise<void>) {
    this.busy = true
    try {
      await operation()
      await this.refresh()
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      this.busy = false
    }
  }

  refreshAll = () => this.run(() => this.refresh())
  startMonitor = () =>
    this.run(async () => {
      await this.client.invoke("riot_start_monitor")
    })
  stopMonitor = () =>
    this.run(async () => {
      await this.client.invoke("riot_stop_monitor")
    })
  toggleRpc = () =>
    this.run(async () => {
      await this.client.invoke("discord_rpc_set_enabled", {
        enabled: !this.rpcStatus.enabled,
      })
    })

  setOverlayTheme = (theme: OverlayTheme) => {
    this.overlayTheme = theme
    void this.setSetting("overlayTheme", theme)
  }
  async copyOverlayUrl() {
    const url = this.overlayStatus.url
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success(i18n.t("overlay.copied"))
    } catch (error) {
      toast.error(errorText(error))
    }
  }
  async openOverlayUrl() {
    const url = this.overlayStatus.url
    if (url) await this.open(url)
  }
  async open(url: string) {
    try {
      await this.client.openUrl(url)
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  async setSetting<K extends SettingKey>(key: K, value: Settings[K]) {
    const previous = this.settings
    const next = { ...previous, [key]: value }
    const localeChange = key === "uiLocale" || key === "rpcLocale"
    if (localeChange) this.busy = true
    this.settings = next
    applyInterfacePreferences(next)
    try {
      const result = await this.client.invoke<SettingsBootstrap>(
        "settings_set",
        { settings: next },
      )
      await applyUiLocale(result.settings.uiLocale)
      this.settings = result.settings
      applyInterfacePreferences(result.settings)
      this.rpcStatus = result.rpcStatus
      if (key === "uiLocale") await this.loadPresentation(true)
    } catch (error) {
      this.settings = previous
      applyInterfacePreferences(previous)
      if (key === "uiLocale") await applyUiLocale(previous.uiLocale)
      toast.error(errorText(error))
    } finally {
      if (localeChange) this.busy = false
    }
  }

  async checkForUpdate(silent = false) {
    this.updater = {
      ...this.updater,
      status: "checking",
      message: message("updates.checking"),
      progress: null,
    }
    try {
      const update = await this.client.checkForUpdate()
      this.availableUpdate = update
      this.lastChecked = new Date()
      this.updater = update
        ? {
            status: "available",
            message: message("updates.available", { version: update.version }),
            currentVersion: update.currentVersion,
            version: update.version,
            date: update.date,
            body: update.body,
            progress: null,
          }
        : {
            ...this.updater,
            status: "current",
            message: message("updates.current"),
            progress: null,
          }
    } catch (error) {
      const detail = String(error instanceof Error ? error.message : error)
      this.updater = {
        ...this.updater,
        status: "error",
        message: message("errors.generic", undefined, detail),
      }
      this.lastChecked = new Date()
      if (!silent) toast.error(detail)
    }
  }

  async installAvailableUpdate() {
    const update = this.availableUpdate
    if (!update) return
    this.updater = {
      ...this.updater,
      status: "installing",
      message: message("updates.installing", { version: update.version }),
      progress: 0,
    }
    let downloaded = 0
    let total: number | undefined
    const onEvent = (event: DownloadEvent) => {
      if (event.event === "Started") total = event.data.contentLength
      if (event.event === "Progress") {
        downloaded += event.data.chunkLength
        const progress = total
          ? Math.min(99, Math.round((downloaded / total) * 100))
          : null
        this.updater = {
          ...this.updater,
          progress,
          message: message("updates.downloading", {
            progress: progress ?? formatBytes(downloaded),
          }),
        }
      }
      if (event.event === "Finished")
        this.updater = {
          ...this.updater,
          progress: 100,
          message: message("updates.installingNow"),
        }
    }
    try {
      await update.downloadAndInstall(onEvent)
      this.updater = {
        ...this.updater,
        status: "installed",
        message: message("updates.installed"),
        progress: 100,
      }
      await this.client.relaunch()
    } catch (error) {
      const detail = String(error instanceof Error ? error.message : error)
      this.updater = {
        ...this.updater,
        status: "error",
        message: message("errors.generic", undefined, detail),
      }
      toast.error(detail)
    }
  }

  private async loadPresentation(force = false) {
    const snapshot = this.snapshot
    if (!snapshot) {
      this.presentationKey = null
      this.presentation = null
      return
    }
    const key = [
      this.settings.uiLocale,
      snapshot.agentId ?? "",
      snapshot.mapId ?? "",
      snapshot.rank?.tier ?? "",
    ].join(":")
    if (!force && key === this.presentationKey) return
    this.presentationKey = key
    const request = ++this.presentationRequest
    this.presentation = null
    try {
      const value = await this.client.invoke<ValorantPresentation>(
        "valorant_get_presentation",
        {
          locale: this.settings.uiLocale,
          agentId: snapshot.agentId,
          mapId: snapshot.mapId,
          tier: snapshot.rank?.tier,
        },
      )
      if (this.active && request === this.presentationRequest)
        this.presentation = mapAssets(value, this.client)
    } catch {
      if (this.active && request === this.presentationRequest) {
        this.presentationKey = null
        this.presentation = null
      }
    }
  }
}

function applyInterfacePreferences(settings: Settings) {
  document.documentElement.dataset.interfaceScale = settings.interfaceScale
  document.documentElement.dataset.reduceMotion = String(settings.reduceMotion)
}

function mapAssets(
  value: ValorantPresentation,
  client: RadianiteClient,
): ValorantPresentation {
  const asset = (path?: string | null) =>
    !path || /^(?:https?:|data:)/i.test(path)
      ? path
      : client.convertFileSrc(path)
  return {
    ...value,
    agentIconUrl: asset(value.agentIconUrl),
    agentPortraitUrl: asset(value.agentPortraitUrl),
    mapSplashUrl: asset(value.mapSplashUrl),
    mapListViewIconUrl: asset(value.mapListViewIconUrl),
    rankIconUrl: asset(value.rankIconUrl),
  }
}
function formatBytes(value: number) {
  return value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KB`
}
function errorText(error: unknown) {
  return i18n.t("errors.withDetail", {
    message: i18n.t("errors.generic"),
    detail: error instanceof Error ? error.message : String(error),
  })
}
