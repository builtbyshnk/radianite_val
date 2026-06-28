# Localization

Radianite keeps the app language and Discord Rich Presence language independent. Both use canonical BCP 47 tags and fall back to `en-US` one key at a time, so partial translations are welcome.

## Add a locale

1. Choose one of the pre-registered catalogs. If the language is not listed, add its metadata to `locale-registry.json`.
2. For the interface, fill the empty values in `src-ui/locales/ui/<tag>.json`. Translate values only and preserve every `{{placeholder}}`.
3. For tray and Rich Presence translations, copy the keys you are translating from `src-rs/locales/en-US.json` into the matching `{}` catalog. Preserve every `%{placeholder}`. RPC templates may reorder placeholders for natural grammar. Do not add empty values: missing Rust keys safely fall back to English.
4. Use `direction: "rtl"` for right-to-left languages. Run the app in that locale and check the dashboard, settings navigation, switches, dialog close button, and Discord preview.
5. Add your name to `contributors`, then run `bun run locales:check`, `bun run build`, and `cargo test --manifest-path src-rs/Cargo.toml`.

All pre-registered catalogs are selectable in the app. Empty or missing interface values display English. Locale metadata should use the language's native name, an English name, direction, and contributor names.
