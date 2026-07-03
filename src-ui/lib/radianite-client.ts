import { getVersion } from "@tauri-apps/api/app"
import { convertFileSrc, invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { openUrl } from "@tauri-apps/plugin-opener"
import { relaunch } from "@tauri-apps/plugin-process"
import { check, type Update } from "@tauri-apps/plugin-updater"

export interface RadianiteClient {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>
  listen<T>(event: string, handler: (payload: T) => void): Promise<() => void>
  getVersion(): Promise<string>
  convertFileSrc(path: string): string
  openUrl(url: string): Promise<void>
  relaunch(): Promise<void>
  checkForUpdate(): Promise<Update | null>
}

export const tauriClient: RadianiteClient = {
  invoke,
  listen: <T>(event: string, handler: (payload: T) => void) =>
    listen<T>(event, ({ payload }) => handler(payload)),
  getVersion,
  convertFileSrc,
  openUrl,
  relaunch,
  checkForUpdate: check,
}
