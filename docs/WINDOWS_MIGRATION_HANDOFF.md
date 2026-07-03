# Windows Handoff: React → Svelte 5 Migration

## Goal

Validate completed Radianite frontend migration on Windows. Frontend changed from React 19 to plain Svelte 5 + Vite. Rust/Tauri APIs, UI, behavior, dimensions, copy, and localization remain unchanged.

## Repository State

- Branch: `main`
- Worktree was clean after migration.
- React performance baseline: `6ea1805`
- Migration tip at handoff: `302244f`

Migration commits:

```text
302244f perf(ui): add Windows migration benchmark harness
4d7cb28 test(ui): enforce Svelte parity and lifecycle coverage
ae6f99e feat(ui): migrate frontend to Svelte 5
c3d7231 test(ui): capture React migration baselines
```

## Implemented

- Plain Svelte 5 SPA; no SvelteKit.
- Source-owned shadcn-svelte/Bits UI primitives.
- Svelte rune-based `RadianiteController` and typed `RadianiteClient` boundary.
- Tauri commands/events, updater, settings rollback, localization, window controls, Discord RPC, overlay, and presentation assets preserved.
- Settings and release-notes dialogs lazy-loaded.
- Markdown uses `marked` + DOMPurify.
- Tabler icons use direct per-icon imports.
- React packages and TSX frontend removed.
- CI runs locale validation, frontend tests/build, Rust checks, and Windows NSIS smoke build.

## Verification Already Passed

```text
bun install --frozen-lockfile
bun run locales:check
bun run build
bun run test
bun run test:visual
cargo fmt --check
cargo clippy -- -D warnings
cargo test
```

Results:

- `svelte-check`: 0 errors, 0 warnings.
- Vitest: 5 tests passed.
- Playwright: 22 React golden states across `1152×768` and `1024×600`; ≤0.1% pixel delta.
- Rust: 53 tests passed.
- Vite transformed modules: `6,613 → 873`.
- Main JS raw: `435.16 KB → 244.42 KB` (`-43.8%`).
- Main JS gzip: `135.67 KB → 78.14 KB` (`-42.4%`).
- Total JS raw: `666.39 KB → 486.44 KB` (`-27.0%`).
- Total JS gzip: `207.13 KB → 149.76 KB` (`-27.7%`).
- CSS gzip increased: `11.76 KB → 14.80 KB` (`+25.8%`).

Bundle report: [`docs/FRONTEND_MIGRATION_BENCHMARK.md`](./FRONTEND_MIGRATION_BENCHMARK.md)

## Windows Tasks

Start Codex from repository on Windows. Ask it to read this file, `AGENTS.md`, and continue Windows verification.

Run normal checks:

```powershell
bun install --frozen-lockfile
bun run locales:check
bun run build
bun run test
bun run test:visual
Push-Location src-rs
cargo fmt --check
cargo clippy -- -D warnings
cargo test
Pop-Location
```

Build Windows installer:

```powershell
bun run tauri build --bundles nsis --config '{"bundle":{"createUpdaterArtifacts":false}}' --ci --no-sign
```

Run authoritative benchmark:

```powershell
bun run benchmark:windows
```

Benchmark prerequisites:

- Windows 10/11.
- Close Radianite, Riot Client, VALORANT, and Discord.
- Use stable power mode; avoid other heavy workloads.
- Keep WebView2 updated.
- Expect two isolated worktree builds and roughly 30 paired runtime runs; process can take significant time.

Generated untracked outputs:

```text
benchmark-results/frontend-migration.json
benchmark-results/frontend-migration.md
```

Harness source:

```text
scripts/benchmark-frontend.ps1
scripts/benchmark-frontend.mjs
docs/frontend-migration-benchmark.schema.json
```

## Benchmark Gate

Pass only when:

- Initial JS raw and gzip shrink.
- Median FCP improves.
- Median app-ready time improves.
- Median steady process-tree memory improves.
- No measured p95 regresses more than 5%.

If gate fails, preserve raw results. Profile and optimize; do not alter measurements to force pass. Update `docs/FRONTEND_MIGRATION_BENCHMARK.md` with Windows results and commit report.

## Windows Functional QA

Verify real Tauri app, not fixture-only browser UI:

1. Cold launch and startup veil dismissal.
2. Custom title-bar minimize, maximize, close, drag region.
3. Riot monitor start/stop and refresh.
4. Disconnected, menus, matchmaking, pregame, live match, and range states when available.
5. OBS overlay URL, copy/open, and preview.
6. Discord RPC enable/disable and activity content.
7. Settings switches and RPC locale selection.
8. Update check, release notes, download progress, and signed installer flow without installing unwanted update.
9. Tray/minimize behavior and production shortcut blocking.
10. Console/runtime errors and listener cleanup after relaunch.

## Known Pending Work

- Windows NSIS build not run in original macOS session.
- Windows native startup, FCP, memory, executable, installer, and installed-size comparisons not yet measured.
- Hard benchmark gate therefore remains unresolved.

## Useful Prompt For Windows Codex

```text
Read AGENTS.md and docs/WINDOWS_MIGRATION_HANDOFF.md. Continue Windows validation of React-to-Svelte migration. Run all listed checks, NSIS build, and bun run benchmark:windows. Diagnose and fix any migration-caused failure. Preserve raw benchmark evidence, update docs/FRONTEND_MIGRATION_BENCHMARK.md, and commit Windows verification results.
```
