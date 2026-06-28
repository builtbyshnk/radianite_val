import { useState } from "react"
import {
  IconBrandDiscord,
  IconBroadcast,
  IconCopy,
  IconExternalLink,
  IconHeart,
  IconInfoCircle,
  IconSettings,
  type Icon,
} from "@tabler/icons-react"
import { openUrl } from "@tauri-apps/plugin-opener"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type {
  OverlayStatus,
  OverlayTheme,
  RpcStatus,
  SettingKey,
  Settings,
} from "@/lib/types"
import { OVERLAY_THEMES } from "@/lib/types"

type TabId = "general" | "overlay" | "discord" | "donate" | "about"

const NAV: Array<{ id: TabId; label: string; icon: Icon }> = [
  { id: "general", label: "General", icon: IconSettings },
  { id: "overlay", label: "Overlay", icon: IconBroadcast },
  { id: "discord", label: "Discord RPC", icon: IconBrandDiscord },
  { id: "donate", label: "Donate", icon: IconHeart },
  { id: "about", label: "About", icon: IconInfoCircle },
]

const REPO_URL = "https://github.com/radcolor-dev/radianite_val"
const SITE_URL = "https://radcolor.dev"

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSetSetting,
  overlay,
  onCopyOverlay,
  onOpenOverlay,
  rpc,
  onToggleRpc,
  busy,
  appVersion,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: Settings
  onSetSetting: <K extends SettingKey>(key: K, value: Settings[K]) => void
  overlay: OverlayStatus
  onCopyOverlay: () => void
  onOpenOverlay: () => void
  rpc: RpcStatus
  onToggleRpc: () => void
  busy: boolean
  appVersion: string | null
}) {
  const [activeTab, setActiveTab] = useState<TabId>("general")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[38rem] max-h-[calc(100%-2rem)] max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Configure Radianite preferences.
        </DialogDescription>

        <nav className="flex w-52 shrink-0 flex-col gap-1 border-r bg-sidebar/60 p-3">
          <span className="px-2.5 py-2 text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
            Settings
          </span>
          {NAV.map((item) => {
            const Icon = item.icon
            const active = item.id === activeTab
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          {activeTab === "donate" ? (
            <DonatePanel key="donate" className="page-transition" />
          ) : (
            <ScrollArea key={activeTab} className="page-transition flex-1">
              <div className="flex flex-col gap-7 p-7">
                {activeTab === "general" && (
                  <GeneralPanel settings={settings} onSetSetting={onSetSetting} />
                )}
                {activeTab === "overlay" && (
                  <OverlayPanel
                    overlay={overlay}
                    onCopy={onCopyOverlay}
                    onOpen={onOpenOverlay}
                    settings={settings}
                    onSetSetting={onSetSetting}
                  />
                )}
                {activeTab === "discord" && (
                  <DiscordPanel rpc={rpc} onToggle={onToggleRpc} busy={busy} />
                )}
                {activeTab === "about" && <AboutPanel version={appVersion} />}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PanelHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="font-heading text-base font-medium">{title}</h2>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function SettingRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-background/40 px-4 py-3.5">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}

function GeneralPanel({
  settings,
  onSetSetting,
}: {
  settings: Settings
  onSetSetting: <K extends SettingKey>(key: K, value: Settings[K]) => void
}) {
  return (
    <>
      <PanelHeading
        title="General"
        description="Control how Radianite starts and behaves on your system."
      />
      <div className="flex flex-col gap-3">
        <SettingRow
          title="Run at boot"
          description="Launch Radianite automatically when you sign in to Windows."
          checked={settings.runAtBoot}
          onCheckedChange={(value) => onSetSetting("runAtBoot", value)}
        />
        <SettingRow
          title="Minimize to tray on exit"
          description="Closing the window keeps Radianite running in the system tray."
          checked={settings.minimizeToTray}
          onCheckedChange={(value) => onSetSetting("minimizeToTray", value)}
        />
      </div>
    </>
  )
}

function OverlayPanel({
  overlay,
  onCopy,
  onOpen,
  settings,
  onSetSetting,
}: {
  overlay: OverlayStatus
  onCopy: () => void
  onOpen: () => void
  settings: Settings
  onSetSetting: <K extends SettingKey>(key: K, value: Settings[K]) => void
}) {
  const url = overlay.url ?? null

  return (
    <>
      <PanelHeading
        title="OBS Overlay"
        description="Add this URL as a Browser Source in OBS to show your live rank."
      />
      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">
            Browser Source URL
          </p>
          <code className="block w-full truncate rounded-md border bg-background/60 px-2.5 py-1.5 font-mono text-xs">
            {url ?? "Overlay not running"}
          </code>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCopy} disabled={!url}>
            <IconCopy data-icon="inline-start" />
            Copy URL
          </Button>
          <Button variant="outline" onClick={onOpen} disabled={!url}>
            <IconExternalLink data-icon="inline-start" />
            Open
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Suggested size:{" "}
          <span className="font-mono text-foreground">360 × 90</span>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/40 px-4 py-3.5">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground">Theme</span>
            <span className="text-xs text-muted-foreground">
              Choose how the overlay looks. Changes apply within ~2s.
            </span>
          </div>
          <Select
            value={settings.overlayTheme}
            onValueChange={(value) =>
              onSetSetting("overlayTheme", value as OverlayTheme)
            }
          >
            <SelectTrigger className="w-40 shrink-0" size="sm">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              {OVERLAY_THEMES.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  {theme.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SettingRow
          title="Show player ID"
          description="Display your Riot name and tag on the overlay. Turn off for privacy."
          checked={settings.overlayShowPlayerId}
          onCheckedChange={(value) =>
            onSetSetting("overlayShowPlayerId", value)
          }
        />
      </div>
    </>
  )
}

function DiscordPanel({
  rpc,
  onToggle,
  busy,
}: {
  rpc: RpcStatus
  onToggle: () => void
  busy: boolean
}) {
  return (
    <>
      <PanelHeading
        title="Discord Rich Presence"
        description="Show your current Valorant match and rank on your Discord profile."
      />
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-background/40 px-4 py-3.5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground">
            Enable Discord RPC
          </span>
          <span className="text-xs text-muted-foreground">{rpc.message}</span>
        </div>
        <Switch
          checked={rpc.enabled}
          disabled={busy}
          onCheckedChange={onToggle}
        />
      </label>
    </>
  )
}

function DonatePanel({ className }: { className?: string }) {
  return (
    <iframe
      title="Support Radianite"
      src="https://radcolor.dev/donate"
      className={cn("size-full border-0 bg-background", className)}
    />
  )
}

function AboutPanel({ version }: { version: string | null }) {
  return (
    <>
      <PanelHeading
        title="About Radianite"
        description="Your tactical Valorant companion for every match."
      />
      <dl className="flex flex-col gap-2.5 text-xs">
        <div className="flex items-center justify-between rounded-lg border bg-background/40 px-4 py-3">
          <dt className="text-muted-foreground">Version</dt>
          <dd className="font-mono text-foreground">v{version ?? "—"}</dd>
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-background/40 px-4 py-3">
          <dt className="text-muted-foreground">License</dt>
          <dd className="font-mono text-foreground">GPL-3.0-only</dd>
        </div>
      </dl>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => openUrl(REPO_URL)}>
          <IconExternalLink data-icon="inline-start" />
          Repository
        </Button>
        <Button variant="outline" onClick={() => openUrl(SITE_URL)}>
          <IconExternalLink data-icon="inline-start" />
          Website
        </Button>
      </div>
    </>
  )
}
