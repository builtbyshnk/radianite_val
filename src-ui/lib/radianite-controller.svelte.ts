import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater"
import { toast } from "svelte-sonner"

import i18n, { applyUiLocale, detectedLocale } from "@/lib/i18n"
import { tauriClient, type RadianiteClient } from "@/lib/radianite-client"
import type { AppSnapshot, CoreStatus, DiagnosticSnapshot, LiveSnapshot, LocalizedMessage, OverlayStatus, RpcStatus, SettingKey, Settings, UpdaterState, ValorantPresentation } from "@/lib/types"

const message = (key: string, args?: Record<string, string | number>, detail?: string): LocalizedMessage => ({ key, args, detail })
const initialStatus: CoreStatus = { kind: "disconnected", message: message("status.message.notStarted"), monitored: false, updatedAt: "" }
const initialDiagnostics: DiagnosticSnapshot = { status: initialStatus, riotInstallsJsonExists: false, lockfileExists: false, lockfilePortPresent: false, localApiReady: false, sessionProductIds: [], valorantSessionPresent: false, puuidPresent: false, accessTokenReady: false, entitlementTokenReady: false, updatedAt: "" }
const initialRpc: RpcStatus = { enabled: false, connected: false, configured: false, message: message("status.rpc.notLoaded"), locale: "en-US", preview: null, updatedAt: "" }
const initialOverlay: OverlayStatus = { enabled: false, url: null, port: null, message: message("status.overlay.notLoaded"), updatedAt: "" }
const initialUpdater: UpdaterState = { status: "idle", message: message("updates.state.idle"), progress: null }
const defaultSettings: Settings = { runAtBoot: false, minimizeToTray: true, enableRpcOnStart: true, uiLocale: detectedLocale("ui"), rpcLocale: detectedLocale("rpc") }
type SettingsBootstrap = { settings: Settings; rpcStatus: RpcStatus }

export class RadianiteController {
  diagnostics = $state<DiagnosticSnapshot>(initialDiagnostics)
  snapshot = $state<LiveSnapshot | null>(null)
  presentation = $state<ValorantPresentation | null>(null)
  rpcStatus = $state<RpcStatus>(initialRpc)
  overlayStatus = $state<OverlayStatus>(initialOverlay)
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

  constructor(private client: RadianiteClient = tauriClient) {}
  get initializing() { return !this.backendReady || !this.settingsReady }

  async initialize() {
    this.active = true
    this.timer = setInterval(() => { this.now = Date.now() }, 1000)
    await Promise.allSettled([this.initializeBackend(), this.initializeSettings()])
  }

  destroy() {
    this.active = false
    this.presentationRequest += 1
    this.unlisteners.splice(0).forEach((unlisten) => unlisten())
    if (this.timer) clearInterval(this.timer)
  }

  private async initializeBackend() {
    try {
      const listeners = await Promise.all([
        this.client.listen<CoreStatus>("riot:status", (status) => { this.diagnostics = { ...this.diagnostics, status } }),
        this.client.listen<LiveSnapshot | null>("riot:snapshot", (snapshot) => { this.snapshot = snapshot; this.lastSync = new Date(); void this.loadPresentation() }),
        this.client.listen<RpcStatus>("discord:status", (status) => { this.rpcStatus = status }),
      ])
      if (!this.active) { listeners.forEach((unlisten) => unlisten()); return }
      this.unlisteners.push(...listeners)
      void this.client.getVersion().then((version) => { if (this.active) this.appVersion = version }).catch(() => { if (this.active) this.appVersion = null })
      const status = await this.client.invoke<CoreStatus>("riot_start_monitor")
      if (this.active) {
        this.diagnostics = { ...this.diagnostics, status }
        this.backendReady = true
        void this.refresh().catch((error) => { if (this.active) toast.error(errorText(error)) })
      }
    } catch (error) { if (this.active) toast.error(errorText(error)) }
    finally { if (this.active) this.backendReady = true }
  }

  private async initializeSettings() {
    try {
      const result = await this.client.invoke<SettingsBootstrap>("settings_initialize", { defaultUiLocale: defaultSettings.uiLocale, defaultRpcLocale: defaultSettings.rpcLocale })
      await applyUiLocale(result.settings.uiLocale)
      if (this.active) { this.settings = result.settings; this.rpcStatus = result.rpcStatus }
    } catch (error) { if (this.active) toast.error(errorText(error)) }
    finally { if (this.active) this.settingsReady = true }
  }

  async refresh() {
    const next = await this.client.invoke<AppSnapshot>("app_get_snapshot")
    this.diagnostics = next.diagnostics; this.snapshot = next.liveSnapshot; this.rpcStatus = next.rpcStatus; this.overlayStatus = next.overlayStatus; this.lastSync = new Date()
    await this.loadPresentation()
  }

  private async run(operation: () => Promise<void>) {
    this.busy = true
    try { await operation(); await this.refresh() } catch (error) { toast.error(errorText(error)) } finally { this.busy = false }
  }

  refreshAll = () => this.run(() => this.refresh())
  startMonitor = () => this.run(async () => { await this.client.invoke("riot_start_monitor") })
  stopMonitor = () => this.run(async () => { await this.client.invoke("riot_stop_monitor") })
  toggleRpc = () => this.run(async () => { await this.client.invoke("discord_rpc_set_enabled", { enabled: !this.rpcStatus.enabled }) })

  async copyOverlayUrl() {
    if (!this.overlayStatus.url) return
    try { await navigator.clipboard.writeText(this.overlayStatus.url); toast.success(i18n.t("overlay.copied")) } catch (error) { toast.error(errorText(error)) }
  }
  async openOverlayUrl() { if (this.overlayStatus.url) await this.open(this.overlayStatus.url) }
  async open(url: string) { try { await this.client.openUrl(url) } catch (error) { toast.error(errorText(error)) } }

  async setSetting<K extends SettingKey>(key: K, value: Settings[K]) {
    const previous = this.settings
    const next = { ...previous, [key]: value }
    const localeChange = key === "uiLocale" || key === "rpcLocale"
    if (localeChange) this.busy = true
    this.settings = next
    try {
      const result = await this.client.invoke<SettingsBootstrap>("settings_set", { settings: next })
      await applyUiLocale(result.settings.uiLocale); this.settings = result.settings; this.rpcStatus = result.rpcStatus
      if (key === "uiLocale") await this.loadPresentation()
    } catch (error) { this.settings = previous; if (key === "uiLocale") await applyUiLocale(previous.uiLocale); toast.error(errorText(error)) }
    finally { if (localeChange) this.busy = false }
  }

  async checkForUpdate() {
    this.updater = { ...this.updater, status: "checking", message: message("updates.checking"), progress: null }
    try {
      const update = await this.client.checkForUpdate(); this.availableUpdate = update; this.lastChecked = new Date()
      this.updater = update ? { status: "available", message: message("updates.available", { version: update.version }), currentVersion: update.currentVersion, version: update.version, date: update.date, body: update.body, progress: null } : { ...this.updater, status: "current", message: message("updates.current"), progress: null }
    } catch (error) { const detail = String(error instanceof Error ? error.message : error); this.updater = { ...this.updater, status: "error", message: message("errors.generic", undefined, detail) }; this.lastChecked = new Date(); toast.error(detail) }
  }

  async installAvailableUpdate() {
    const update = this.availableUpdate
    if (!update) return
    this.updater = { ...this.updater, status: "installing", message: message("updates.installing", { version: update.version }), progress: 0 }
    let downloaded = 0; let total: number | undefined
    const onEvent = (event: DownloadEvent) => {
      if (event.event === "Started") total = event.data.contentLength
      if (event.event === "Progress") { downloaded += event.data.chunkLength; const progress = total ? Math.min(99, Math.round(downloaded / total * 100)) : null; this.updater = { ...this.updater, progress, message: message("updates.downloading", { progress: progress ?? formatBytes(downloaded) }) } }
      if (event.event === "Finished") this.updater = { ...this.updater, progress: 100, message: message("updates.installingNow") }
    }
    try { await update.downloadAndInstall(onEvent); this.updater = { ...this.updater, status: "installed", message: message("updates.installed"), progress: 100 }; await this.client.relaunch() }
    catch (error) { const detail = String(error instanceof Error ? error.message : error); this.updater = { ...this.updater, status: "error", message: message("errors.generic", undefined, detail) }; toast.error(detail) }
  }

  private async loadPresentation() {
    const request = ++this.presentationRequest
    const snapshot = this.snapshot
    if (!snapshot) { this.presentation = null; return }
    this.presentation = null
    try {
      const value = await this.client.invoke<ValorantPresentation>("valorant_get_presentation", { locale: this.settings.uiLocale, agentId: snapshot.agentId, mapId: snapshot.mapId, tier: snapshot.rank?.tier })
      if (this.active && request === this.presentationRequest) this.presentation = mapAssets(value, this.client)
    } catch { if (this.active && request === this.presentationRequest) this.presentation = null }
  }
}

function mapAssets(value: ValorantPresentation, client: RadianiteClient): ValorantPresentation {
  const asset = (path?: string | null) => !path || /^(?:https?:|data:)/i.test(path) ? path : client.convertFileSrc(path)
  return { ...value, agentIconUrl: asset(value.agentIconUrl), agentPortraitUrl: asset(value.agentPortraitUrl), mapSplashUrl: asset(value.mapSplashUrl), mapListViewIconUrl: asset(value.mapListViewIconUrl), rankIconUrl: asset(value.rankIconUrl) }
}
function formatBytes(value: number) { return value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KB` }
function errorText(error: unknown) { return i18n.t("errors.withDetail", { message: i18n.t("errors.generic"), detail: error instanceof Error ? error.message : String(error) }) }
