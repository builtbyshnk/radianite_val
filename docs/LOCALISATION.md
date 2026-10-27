# Localization

Radianite keeps the app language and Discord Rich Presence language independent. Both use canonical BCP 47 tags and fall back to `en-US` one key at a time, so partial translations are welcome.

The interface ships in English, Arabic, Simplified Chinese, French, German, Hindi, Japanese, Korean, Brazilian Portuguese, Russian, and Spanish. The app language defaults to **System language (automatic)** for new settings. This saves `uiLocale: "system"` and resolves the Windows display language in Rust on startup and when settings are applied. Supported regional variants use the matching language (for example, `fr-CA` uses `fr-FR`); unsupported languages use English. Existing explicit language choices are preserved. Discord language selection is separate.

## Add a locale

1. Choose one of the pre-registered catalogs. If the language is not listed, add its metadata to `locale-registry.json`.
2. For the interface, fill the empty values in `src-ui/locales/ui/<tag>.json`. Translate values only and preserve every `{{placeholder}}`.
3. For tray and Rich Presence translations, copy the keys you are translating from `src-rs/locales/en-US.json` into the matching `{}` catalog. Preserve every `%{placeholder}`. RPC templates may reorder placeholders for natural grammar. Do not add empty values: missing Rust keys safely fall back to English.
4. Use `direction: "rtl"` for right-to-left languages. Run the app in that locale and check the dashboard, settings navigation, switches, dialog close button, and Discord preview.
5. Add your name to `contributors`, then run `bun run locales:check`, `bun run build`, and `cargo test --manifest-path src-rs/Cargo.toml`.

Only catalogs marked `ui: true` are selectable as app languages; `rpc: true` controls the separate Discord language list. Enable `ui` after adding the UI catalog and its tray translations. Empty or missing translation values display English. Locale metadata should use the language's native name, an English name, direction, and contributor names. The shipped UI catalogs are checked for complete key coverage by the frontend tests.
