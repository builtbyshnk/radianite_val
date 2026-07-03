export const overlayThemes = [
  { id: "nightfall", name: "Nightfall" },
  { id: "catppuccin", name: "Catppuccin" },
  { id: "evergreen", name: "Evergreen Veil" },
  { id: "solarized", name: "Solarized Circuit" },
  { id: "porcelain", name: "Porcelain Tide" },
  { id: "rose", name: "Rosé Quartz" },
] as const

export type OverlayTheme = (typeof overlayThemes)[number]["id"]

export function themedOverlayUrl(
  url: string | null | undefined,
  _theme: OverlayTheme,
) {
  return url ?? null
}
