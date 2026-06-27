import { useState } from "react"

import { TitleBar } from "@/components/title-bar"
import { LiveMatchHero } from "@/components/live-match-hero"
import { CoreStatusCard } from "@/components/core-status-card"
import { OverlayCard } from "@/components/overlay-card"
import { DiscordCard } from "@/components/discord-card"
import { UpdatesCard } from "@/components/updates-card"
import { QuickInfoCard } from "@/components/quick-info-card"
import { StatusBar } from "@/components/status-bar"
import { SettingsDialog } from "@/components/settings-dialog"
import { useRadianite } from "@/lib/use-radianite"
import "./App.css"

function App() {
  const r = useRadianite()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TitleBar
        status={r.diagnostics.status}
        version={r.appVersion}
        busy={r.busy}
        onRefresh={r.refresh}
        onStartMonitor={r.startMonitor}
        onStopMonitor={r.stopMonitor}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex-1 overflow-y-auto p-3">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(22rem,1fr)]">
            <LiveMatchHero snapshot={r.snapshot} />

            <div className="flex flex-col gap-3">
              <CoreStatusCard diagnostics={r.diagnostics} />
              <OverlayCard
                overlay={r.overlayStatus}
                onCopy={r.copyOverlayUrl}
                onOpen={r.openOverlayUrl}
              />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <DiscordCard
              rpc={r.rpcStatus}
              snapshot={r.snapshot}
              busy={r.busy}
              onToggle={r.toggleRpc}
            />
            <UpdatesCard
              updater={r.updater}
              version={r.appVersion}
              canInstall={Boolean(r.availableUpdate)}
              onCheck={r.checkForUpdate}
              onInstall={r.installAvailableUpdate}
            />
            <QuickInfoCard
              overlay={r.overlayStatus}
              rpc={r.rpcStatus}
              snapshot={r.snapshot}
              lastSync={r.lastSync}
            />
          </div>
        </div>
      </main>

      <StatusBar
        status={r.diagnostics.status}
        lastSync={r.lastSync}
        uptimeMs={r.uptimeMs}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={r.settings}
        onSetSetting={r.setSetting}
        overlay={r.overlayStatus}
        onCopyOverlay={r.copyOverlayUrl}
        onOpenOverlay={r.openOverlayUrl}
        rpc={r.rpcStatus}
        onToggleRpc={r.toggleRpc}
        busy={r.busy}
        appVersion={r.appVersion}
      />
    </div>
  )
}

export default App
