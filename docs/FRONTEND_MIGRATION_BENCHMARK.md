# Frontend Migration Benchmark

React baseline: `6ea1805`. Svelte candidate snapshot: `d5107fd4d7f28c893c0299cf09ac387826a1b4b8`.

## Result

The Svelte migration materially reduces shipped assets, JavaScript, native package size, and steady-state memory. Median app-ready time improves slightly and all measured p95 gate metrics remain within the allowed 5% regression limit. The hard benchmark gate nevertheless remains **FAIL** because median first contentful paint is 24 ms slower.

| Gate metric | React | Svelte | Change | Result |
|---|---:|---:|---:|---|
| Initial JS, raw | 435,158 B | 244,479 B | -43.82% | Pass |
| Initial JS, gzip | 136,080 B | 78,465 B | -42.34% | Pass |
| FCP, median | 196 ms | 220 ms | +12.24% | **Fail** |
| FCP, p95 | 780 ms | 352 ms | -54.87% | Pass |
| App ready, median | 418 ms | 416 ms | -0.48% | Pass |
| App ready, p95 | 435 ms | 441 ms | +1.38% | Pass |
| Working set, median | 491,929,600 B | 478,375,936 B | -2.76% | Pass |
| Working set, p95 | 507,940,864 B | 490,082,304 B | -3.52% | Pass |

Gate failure: `fcpMs median did not improve`.

## Bundle and package improvements

| Metric | React | Svelte | Change |
|---|---:|---:|---:|
| Total shipped assets | 843,633 B | 676,350 B | -19.83% |
| Total JS, raw | 666,388 B | 486,499 B | -26.99% |
| Total JS, gzip | 207,702 B | 150,353 B | -27.61% |
| Initial JS, raw | 435,158 B | 244,479 B | -43.82% |
| Initial JS, gzip | 136,080 B | 78,465 B | -42.34% |
| Initial JS, Brotli | 117,428 B | 67,949 B | -42.14% |
| CSS, raw | 65,125 B | 77,731 B | +19.36% |
| CSS, gzip | 11,766 B | 14,721 B | +25.11% |
| Native executable | 8,889,856 B | 8,840,704 B | -0.55% |
| NSIS installer | 3,273,473 B | 3,223,635 B | -1.52% |
| Vite transformed modules | 6,613 | 873 | -86.80% |

CSS is larger because source-owned Svelte/Bits UI primitives move state selectors and component styling out of the React Radix runtime. The net shipped asset result still improves by 19.83%.

## Additional timing observations

| Metric | React median / p95 | Svelte median / p95 | Median change |
|---|---:|---:|---:|
| DOM content loaded | 104.0 / 114.4 ms | 101.5 / 107.5 ms | -2.40% |
| Window load | 113.4 / 126.7 ms | 120.6 / 127.7 ms | +6.35% |

The FCP distribution is more stable under Svelte despite its slower median: p95 improves from 780 ms to 352 ms. The remaining median FCP cost correlates with the larger render-blocking initial stylesheet and is not hidden by changing the gate.

## Method

- Windows x64, Node `v26.2.0`, WebView2 `149.0.4022.98`.
- Three warmups followed by 30 paired runs per frontend.
- Alternating `A/B` then `B/A` ordering.
- Fresh WebView2 user-data directory for every run.
- App readiness measured by `.startup-veil-hidden`.
- Working set measured across the complete process tree after a 5-second settle period.
- Both refs built in detached worktrees with release executables and unsigned NSIS installers.
- All 30 React and 30 Svelte runs contain valid FCP samples.

Raw evidence is written to `benchmark-results/frontend-migration.json`; the generated compact report is `benchmark-results/frontend-migration.md`.

## Windows fixes discovered during validation

- Replaced POSIX-only Playwright environment syntax with `webServer.env`.
- Replaced fragile inline Tauri JSON with `scripts/benchmark-tauri.conf.json` so PowerShell preserves the configuration.
- Added native-command exit checks to the PowerShell harness so failed builds or measurements cannot be reported as success.
- Added bounded WebView2 profile cleanup retries for transient Windows file locks.
- Required a real FCP entry for every sample and corrected WebView2 runtime version detection.
- Restored React-equivalent startup behavior: snapshot refresh runs in the background instead of delaying startup-veil dismissal.

## Verification

- `bun install --frozen-lockfile`: passed.
- `bun run locales:check`: passed for 26 locales.
- `bun run build`: passed; `svelte-check` reported 0 errors and 0 warnings.
- `bun run test`: 5 tests passed.
- `cargo fmt --check`: passed.
- `cargo clippy -- -D warnings`: passed.
- `cargo test`: 53 tests passed.
- Windows NSIS build: passed; `Radianite_0.1.6_x64-setup.exe` produced.
- Playwright now starts on Windows; macOS-generated pixel goldens differ by 0.684% and 0.115% on two states because of platform rendering, so the strict 0.1% visual gate is not recorded as passing on Windows.

## Conclusion

The migration is a clear size and memory improvement and preserves app-ready performance, but it does **not** satisfy the predeclared hard gate because median FCP regresses by 24 ms. The raw result is preserved as measured. A future optimization should target initial CSS delivery and must be validated with another complete 30-pair Windows run before changing this conclusion.
