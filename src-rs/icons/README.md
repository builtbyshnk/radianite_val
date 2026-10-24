# Radianite icon

`icon.svg` is the editable source: a gold mining cart carrying dark rock with
green radianite facets, drawn on a 48 px grid. The dark rounded tile has transparent
corners. Broad shapes and thick outlines keep the mining silhouette readable at
small sizes without texture or glow.

The artwork takes its mining theme from the supplied cart and coal references.
Its dark mineral and green facets interpret the raw and processed forms described
in the [Radianite lore](https://wiki.playvalorant.com/en-us/Lore:Radianite).

From the repository root, regenerate the desktop, UI, and website assets with:

```sh
bun run icons:generate
```

This uses the existing Tauri CLI with no additional dependencies. The Windows ICO
contains 16, 24, 32, 48, 64, and 256 px images, including alpha transparency at every
size. Tauri uses this ICO for the executable and NSIS installer/uninstaller; the
tray uses the default app icon. UI and website PNGs come from the same source.
Unused legacy mobile exports and the Vite/Tauri starter logos have been removed.

The generator also exports SVG/ICO favicons for the frontend and website, a 32 px
website favicon, a 180 px Apple touch icon, and the 1024 px Discord upload at
`assets/branding/radianite.png`. The OBS overlay embeds the same Windows ICO.
See [Discord upload instructions](../../assets/branding/README.md) for the
`radianite` asset key and the separate Discord application-icon setting.

See Microsoft's [icon design guidance](https://learn.microsoft.com/en-us/windows/apps/design/iconography/app-icon-design)
and [Windows icon size guidance](https://learn.microsoft.com/en-us/windows/apps/design/iconography/app-icon-construction).
