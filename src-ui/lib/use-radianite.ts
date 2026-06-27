import { useCallback, useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { getVersion } from "@tauri-apps/api/app"
import { openUrl } from "@tauri-apps/plugin-opener"
import { relaunch } from "@tauri-apps/plugin-process"
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater"
import { load, type Store } from "@tauri-apps/plugin-store"
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from "@tauri-apps/plugin-autostart"
import { toast } from "sonner"

import type {
  CoreStatus,
  DiagnosticSnapshot,
  LiveSnapshot,
  OverlayStatus,
  RpcStatus,
  SettingKey,
  Settings,
  UpdaterState,
} from "@/lib/types"

const initialStatus: CoreStatus = {
  kind: "disconnected",
  message: "Radianite monitor has not started",
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

const initialRpcStatus: RpcStatus = {
  enabled: false,
  connected: false,
  configured: false,
  message: "Discord RPC status has not loaded",
  updatedAt: "",
}

const initialOverlayStatus: OverlayStatus = {
  enabled: false,
  url: null,
  port: null,
  message: "OBS overlay server status has not loaded",
  updatedAt: "",
}

const initialUpdaterState: UpdaterState = {
  status: "idle",
  message: "Updates have not been checked in this session",
  progress: null,
}

const defaultSettings: Settings = {
  runAtBoot: false,
  minimizeToTray: true,
}

const SETTINGS_STORE = "settings.json"

export function useRadianite() {
  const [diagnostics, setDiagnostics] =
    useState<DiagnosticSnapshot>(initialDiagnostics)
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null)
  const [rpcStatus, setRpcStatus] = useState<RpcStatus>(initialRpcStatus)
  const [overlayStatus, setOverlayStatus] =
    useState<OverlayStatus>(initialOverlayStatus)
  const [updater, setUpdater] = useState<UpdaterState>(initialUpdaterState)
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null)
  const [busy, setBusy] = useState(false)
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [startedAt] = useState<number>(() => Date.now())
  const [uptimeMs, setUptimeMs] = useState(0)
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const settingsStore = useRef<Store | null>(null)

  const refresh = useCallback(async () => {
    const [nextDiagnostics, nextSnapshot, nextRpcStatus, nextOverlayStatus] =
      await Promise.all([
        invoke<DiagnosticSnapshot>("riot_get_diagnostics"),
        invoke<LiveSnapshot | null>("riot_get_live_snapshot"),
        invoke<RpcStatus>("discord_rpc_get_status"),
        invoke<OverlayStatus>("overlay_get_status"),
      ])

    setDiagnostics(nextDiagnostics)
    setSnapshot(nextSnapshot)
    setRpcStatus(nextRpcStatus)
    setOverlayStatus(nextOverlayStatus)
    setLastSync(new Date())
  }, [])

  const runCommand = useCallback(
    async (operation: () => Promise<void>) => {
      setBusy(true)
      try {
        await operation()
        await refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const startMonitor = useCallback(
    () =>
      runCommand(async () => {
        await invoke<CoreStatus>("riot_start_monitor")
      }),
    [runCommand],
  )

  const stopMonitor = useCallback(
    () =>
      runCommand(async () => {
        await invoke<CoreStatus>("riot_stop_monitor")
      }),
    [runCommand],
  )

  const toggleRpc = useCallback(
    () =>
      runCommand(async () => {
        await invoke<RpcStatus>("discord_rpc_set_enabled", {
          enabled: !rpcStatus.enabled,
        })
      }),
    [runCommand, rpcStatus.enabled],
  )

  const copyOverlayUrl = useCallback(async () => {
    if (!overlayStatus.url) return
    try {
      await navigator.clipboard.writeText(overlayStatus.url)
      toast.success("Overlay URL copied")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }, [overlayStatus.url])

  const openOverlayUrl = useCallback(async () => {
    if (!overlayStatus.url) return
    try {
      await openUrl(overlayStatus.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }, [overlayStatus.url])

  const setSetting = useCallback(
    async <K extends SettingKey>(key: K, value: Settings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }))

      try {
        if (key === "runAtBoot") {
          if (value) {
            if (!(await isAutostartEnabled())) await enableAutostart()
          } else {
            if (await isAutostartEnabled()) await disableAutostart()
          }
        }

        const store = settingsStore.current
        if (store) {
          await store.set(key, value)
          await store.save()
        }
      } catch (err) {
        setSettings((current) => ({ ...current, [key]: !value }))
        toast.error(err instanceof Error ? err.message : String(err))
      }
    },
    [],
  )

  const checkForUpdate = useCallback(async () => {
    setUpdater((current) => ({
      ...current,
      status: "checking",
      message: "Checking for a signed update",
      progress: null,
    }))

    try {
      const update = await check()
      setAvailableUpdate(update)
      setLastChecked(new Date())

      if (!update) {
        setUpdater((current) => ({
          ...current,
          status: "current",
          message: "This build is up to date",
          progress: null,
        }))
        return
      }

      setUpdater({
        status: "available",
        message: `Version ${update.version} is ready to install`,
        currentVersion: update.currentVersion,
        version: update.version,
        date: update.date,
        body: update.body,
        progress: null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setUpdater((current) => ({ ...current, status: "error", message }))
      setLastChecked(new Date())
      toast.error(message)
    }
  }, [])

  const installAvailableUpdate = useCallback(async () => {
    if (!availableUpdate) return

    setUpdater((current) => ({
      ...current,
      status: "installing",
      message: `Installing version ${availableUpdate.version}`,
      progress: 0,
    }))

    let downloadedBytes = 0
    let contentLength: number | undefined
    const onDownloadEvent = (event: DownloadEvent) => {
      if (event.event === "Started") {
        downloadedBytes = 0
        contentLength = event.data.contentLength
        setUpdater((current) => ({
          ...current,
          message: contentLength
            ? `Downloading ${formatBytes(contentLength)}`
            : "Downloading update",
          progress: 0,
        }))
        return
      }

      if (event.event === "Progress") {
        downloadedBytes += event.data.chunkLength
        setUpdater((current) => ({
          ...current,
          message: contentLength
            ? `Downloaded ${formatBytes(downloadedBytes)} of ${formatBytes(contentLength)}`
            : `Downloaded ${formatBytes(downloadedBytes)}`,
          progress: contentLength
            ? Math.min(100, Math.round((downloadedBytes / contentLength) * 100))
            : null,
        }))
        return
      }

      setUpdater((current) => ({
        ...current,
        message: "Installing update",
        progress: 100,
      }))
    }

    try {
      await availableUpdate.downloadAndInstall(onDownloadEvent)
      setUpdater((current) => ({
        ...current,
        status: "installed",
        message: "Update installed. Relaunching Radianite.",
        progress: 100,
      }))
      await relaunch()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setUpdater((current) => ({ ...current, status: "error", message }))
      toast.error(message)
    }
  }, [availableUpdate])

  useEffect(() => {
    const unlistenCallbacks: Array<() => void> = []

    listen<CoreStatus>("riot:status", (event) => {
      setDiagnostics((current) => ({ ...current, status: event.payload }))
    }).then((unlisten) => unlistenCallbacks.push(unlisten))

    listen<LiveSnapshot | null>("riot:snapshot", (event) => {
      setSnapshot(event.payload)
      setLastSync(new Date())
    }).then((unlisten) => unlistenCallbacks.push(unlisten))

    listen<RpcStatus>("discord:status", (event) => {
      setRpcStatus(event.payload)
    }).then((unlisten) => unlistenCallbacks.push(unlisten))

    getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion(null))

    runCommand(async () => {
      await refresh()
      await invoke<CoreStatus>("riot_start_monitor")
    })

    const refreshTimer = window.setInterval(() => {
      refresh().catch((err) => {
        toast.error(err instanceof Error ? err.message : String(err))
      })
    }, 5000)

    return () => {
      window.clearInterval(refreshTimer)
      unlistenCallbacks.forEach((unlisten) => unlisten())
    }
  }, [refresh, runCommand])

  useEffect(() => {
    let active = true

    const loadSettings = async () => {
      try {
        const store = await load(SETTINGS_STORE)
        settingsStore.current = store

        const runAtBoot =
          (await store.get<boolean>("runAtBoot")) ?? defaultSettings.runAtBoot
        const minimizeToTray =
          (await store.get<boolean>("minimizeToTray")) ??
          defaultSettings.minimizeToTray

        const autostartActive = await isAutostartEnabled().catch(
          () => runAtBoot,
        )

        if (active) setSettings({ runAtBoot: autostartActive, minimizeToTray })

        if (autostartActive !== runAtBoot) {
          await store.set("runAtBoot", autostartActive)
          await store.save()
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err))
      }
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setUptimeMs(Date.now() - startedAt)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [startedAt])

  return {
    diagnostics,
    snapshot,
    rpcStatus,
    overlayStatus,
    updater,
    availableUpdate,
    busy,
    appVersion,
    lastSync,
    lastChecked,
    uptimeMs,
    settings,
    setSetting,
    refresh: () => runCommand(refresh),
    startMonitor,
    stopMonitor,
    toggleRpc,
    copyOverlayUrl,
    openOverlayUrl,
    checkForUpdate,
    installAvailableUpdate,
  }
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  const kb = value / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}
