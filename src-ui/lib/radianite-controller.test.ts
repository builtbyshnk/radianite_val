import { describe, expect, it, vi } from "vitest"
import { RadianiteController } from "@/lib/radianite-controller.svelte"
import type { RadianiteClient } from "@/lib/radianite-client"
import type { CoreStatus, RpcStatus, Settings } from "@/lib/types"

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
  startMinimized: false,
  lowResourceMode: true,
  enableRpcOnStart: true,
  overlayTheme: "nightfall",
  overlayHideDetails: false,
  uiLocale: "en-US",
  rpcLocale: "en-US",
}
describe("RadianiteController", () => {
  it("initializes listeners and releases them on destroy", async () => {
    const unlisten = vi.fn()
    const closeWindow = vi.fn(async () => undefined)
    const handlers = new Map<string, (payload: unknown) => void>()
    const client: RadianiteClient = {
      invoke: async <T>(command: string, args?: Record<string, unknown>) => {
        if (command === "settings_initialize")
          return { settings, rpcStatus: rpc } as T
        if (command === "app_get_snapshot")
          return new Promise<never>(() => undefined) as T
        if (command === "riot_start_monitor") return status as T
        if (command === "settings_set")
          return {
            settings: (args as { settings: Settings }).settings,
            rpcStatus: rpc,
          } as T
        throw new Error(`Unexpected command: ${command}`)
      },
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
    controller.destroy()
    expect(unlisten).toHaveBeenCalledTimes(4)
  })
})
