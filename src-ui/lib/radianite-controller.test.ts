import { afterEach, describe, expect, it, vi } from "vitest"
import { applyUiLocale } from "@/lib/i18n"
import { RadianiteController } from "@/lib/radianite-controller.svelte"
import type { RadianiteClient } from "@/lib/radianite-client"
import type { AppSnapshot, CoreStatus, RpcStatus, Settings } from "@/lib/types"

const status: CoreStatus = {
  kind: "riotClientClosed",
  monitored: true,
  message: { key: "status.message.riotClientClosed" },
  updatedAt: "",
}
const rpc: RpcStatus = {
  enabled: true,
  connected: false,
  configured: true,
  message: { key: "status.rpc.ready" },
  locale: "en-US",
  updatedAt: "",
}
const settings: Settings = {
  runAtBoot: false,
  automaticUpdateChecks: false,
  reduceMotion: false,
  interfaceScale: "default",
  rememberWindowState: false,
  lowResourceMode: true,
  enableRpcOnStart: true,
  rpcHideRank: false,
  rpcHideParty: false,
  rpcHideElapsed: false,
  overlayTheme: "nightfall",
  overlayHideDetails: false,
  uiLocale: "en-US",
  rpcLocale: "en-US",
}
describe("RadianiteController", () => {
  afterEach(() => applyUiLocale("en-US"))

  it("prevents overlapping settings writes and restores the overlay theme after a failed save", async () => {
    let rejectSave: (reason: Error) => void = () => undefined
    const invoke = vi.fn(
      () => new Promise<never>((_, reject) => (rejectSave = reject)),
    )
    const controller = new RadianiteController({
      invoke,
    } as unknown as RadianiteClient)
    const pending = controller.setSetting("overlayTheme", "porcelain")
    expect(controller.busy).toBe(true)
    expect(controller.overlayTheme).toBe("porcelain")
    await controller.setSetting("rpcHideRank", true)
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(controller.settings.rpcHideRank).toBe(false)
    rejectSave(new Error("Settings could not be saved"))
    await pending
    expect(controller.busy).toBe(false)
    expect(controller.settings.overlayTheme).toBe("nightfall")
    expect(controller.overlayTheme).toBe("nightfall")
  })

  it("initializes listeners and releases them on destroy", async () => {
    const unlisten = vi.fn()
    const closeWindow = vi.fn(async () => undefined)
    const presentationCalls = vi.fn()
    const handlers = new Map<string, (payload: unknown) => void>()
    const appSnapshot: AppSnapshot = {
      diagnostics: {
        status,
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
      },
      liveSnapshot: null,
      rpcStatus: rpc,
      overlayStatus: {
        enabled: true,
        url: "http://127.0.0.1:48271/overlay/rank",
        port: 48271,
        message: { key: "status.overlay.running" },
        updatedAt: "",
      },
    }
    const invokeCalls = vi.fn()
    let rejectSettings = false
    const invoke = async <T>(
      command: string,
      args?: Record<string, unknown>,
    ): Promise<T> => {
      invokeCalls(command, args)
      if (command === "settings_initialize")
        return { settings, rpcStatus: rpc, resolvedUiLocale: "en-US" } as T
      if (command === "app_get_snapshot") return appSnapshot as T
      if (command === "settings_set") {
        if (rejectSettings) throw new Error("Settings could not be saved")
        const next = (args as { settings: Settings }).settings
        return {
          settings: next,
          rpcStatus: rpc,
          resolvedUiLocale:
            next.uiLocale === "system" ? "fr-FR" : next.uiLocale,
        } as T
      }
      if (command === "valorant_get_presentation") {
        presentationCalls()
        return {} as T
      }
      throw new Error(`Unexpected command: ${command}`)
    }
    const client: RadianiteClient = {
      invoke,
      listen: async <T>(event: string, handler: (payload: T) => void) => {
        handlers.set(event, handler as (payload: unknown) => void)
        return unlisten
      },
      getVersion: async () => "0.1.6",
      convertFileSrc: (value) => value,
      openUrl: async () => undefined,
      closeWindow,
      relaunch: async () => undefined,
      checkForUpdate: async () => null,
    }
    const controller = new RadianiteController(client)
    await controller.initialize()
    expect(controller.initializing).toBe(false)
    expect(controller.appVersion).toBe("0.1.6")
    expect(controller.overlayStatus.enabled).toBe(true)
    expect(invokeCalls.mock.calls.map(([command]) => command)).not.toContain(
      "riot_start_monitor",
    )
    handlers.get("riot:status")?.({ ...status, kind: "valorantLaunching" })
    expect(controller.diagnostics.status.kind).toBe("valorantLaunching")
    handlers.get("riot:diagnostics")?.({
      ...controller.diagnostics,
      localApiReady: true,
      valorantSessionPresent: true,
      accessTokenReady: true,
      entitlementTokenReady: true,
    })
    expect(controller.diagnostics.localApiReady).toBe(true)
    expect(controller.diagnostics.valorantSessionPresent).toBe(true)
    expect(controller.diagnostics.accessTokenReady).toBe(true)
    expect(controller.diagnostics.entitlementTokenReady).toBe(true)
    await controller.setSetting("lowResourceMode", false)
    expect(closeWindow).not.toHaveBeenCalled()
    await controller.setSetting("interfaceScale", "compact")
    await controller.setSetting("reduceMotion", true)
    expect(document.documentElement.dataset.interfaceScale).toBe("compact")
    expect(document.documentElement.dataset.reduceMotion).toBe("true")
    const snapshot = {
      agentId: "agent",
      mapId: "map",
      rank: { tier: 12 },
    }
    handlers.get("riot:snapshot")?.(snapshot)
    handlers.get("riot:snapshot")?.(snapshot)
    await vi.waitFor(() => expect(presentationCalls).toHaveBeenCalledTimes(1))
    handlers.get("riot:snapshot")?.({
      ...snapshot,
      rank: { tier: 13 },
    })
    await vi.waitFor(() => expect(presentationCalls).toHaveBeenCalledTimes(2))
    await controller.setSetting("uiLocale", "ar-AE")
    expect(controller.settings.uiLocale).toBe("ar-AE")
    expect(controller.settings.rpcLocale).toBe("en-US")
    expect(document.documentElement.lang).toBe("ar-AE")
    expect(document.documentElement.dir).toBe("rtl")
    await controller.setSetting("uiLocale", "system")
    expect(controller.settings.uiLocale).toBe("system")
    expect(controller.resolvedUiLocale).toBe("fr-FR")
    expect(document.documentElement.lang).toBe("fr-FR")
    expect(document.documentElement.dir).toBe("ltr")
    expect(invokeCalls).toHaveBeenLastCalledWith(
      "valorant_get_presentation",
      expect.objectContaining({ locale: "fr-FR" }),
    )
    expect(controller.settings.rpcLocale).toBe("en-US")
    rejectSettings = true
    await controller.setSetting("uiLocale", "ja-JP")
    expect(controller.settings.uiLocale).toBe("system")
    expect(controller.resolvedUiLocale).toBe("fr-FR")
    expect(document.documentElement.lang).toBe("fr-FR")
    expect(controller.busy).toBe(false)
    controller.destroy()
    expect(unlisten).toHaveBeenCalledTimes(4)
  })
})
