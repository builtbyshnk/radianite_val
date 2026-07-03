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
  minimizeToTray: true,
  enableRpcOnStart: true,
  overlayTheme: "nightfall",
  overlayHideDetails: false,
  uiLocale: "en-US",
  rpcLocale: "en-US",
}
describe("RadianiteController", () => {
  it("initializes listeners and releases them on destroy", async () => {
    const unlisten = vi.fn()
    const handlers = new Map<string, (payload: unknown) => void>()
    const client: RadianiteClient = {
      invoke: async <T>(command: string) => {
        if (command === "settings_initialize")
          return { settings, rpcStatus: rpc } as T
        if (command === "app_get_snapshot")
          return new Promise<never>(() => undefined) as T
        if (command === "riot_start_monitor") return status as T
        throw new Error(`Unexpected command: ${command}`)
      },
      listen: async <T>(event: string, handler: (payload: T) => void) => {
        handlers.set(event, handler as (payload: unknown) => void)
        return unlisten
      },
      getVersion: async () => "0.1.6",
      convertFileSrc: (value) => value,
      openUrl: async () => undefined,
      relaunch: async () => undefined,
      checkForUpdate: async () => null,
    }
    const controller = new RadianiteController(client)
    await controller.initialize()
    expect(controller.initializing).toBe(false)
    expect(controller.appVersion).toBe("0.1.6")
    handlers.get("riot:status")?.({ ...status, kind: "valorantLaunching" })
    expect(controller.diagnostics.status.kind).toBe("valorantLaunching")
    controller.destroy()
    expect(unlisten).toHaveBeenCalledTimes(3)
  })
})
