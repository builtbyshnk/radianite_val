# Radianite branding uploads

`radianite.png` is the **1024 × 1024 RGBA PNG** export of the approved ore-cart
icon, with transparent rounded corners. Regenerate it alongside all shipped icon
assets with `bun run icons:generate` from the repository root.

## Discord Rich Presence

1. Open the application's [Rich Presence Art Assets](https://discord.com/developers/applications/1520041097945153566/rich-presence/assets).
2. Upload `radianite.png` and set its asset key to **`radianite`**, all lowercase,
   without the `.png` extension. Save the changes.
3. Restart Radianite or toggle Discord presence off and on to send a new activity.

The app uses `radianite` as its default generic large image in menus and whenever
map or agent artwork is unavailable. Existing map, agent, rank, and mode artwork
still represents game activity; `game_icon_white` and `game_icon_yellow` remain the
queueing and away variants.

If `RADIANITE_DISCORD_APP_ID` selects a different Discord application, upload the
asset to that application instead. If `RADIANITE_DISCORD_ASSET_GAME` is set, remove
the override or set it to `radianite` to use this asset.

## Discord application icon

Upload the same PNG as the **App Icon** under the application's
[General Information](https://discord.com/developers/applications/1520041097945153566/information).
This is a separate setting from Rich Presence Art Assets and has no asset key.
The code cannot change the icon configured in the Developer Portal.

Discord [recommends 1024 × 1024 images](https://github.com/discord/discord-api-docs/blob/main/developers/rich-presence/using-with-the-embedded-app-sdk.mdx#uploading-custom-assets)
for Rich Presence and automatically lowercases uploaded asset keys.
