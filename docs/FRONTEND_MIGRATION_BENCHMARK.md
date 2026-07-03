# Frontend Migration Benchmark

React baseline: `6ea1805`. Svelte candidate: migration branch tip.

## Bundle result on migration development machine

| Metric | React | Svelte | Change |
|---|---:|---:|---:|
| Main JS, raw | 435.16 KB | 244.42 KB | -43.8% |
| Main JS, gzip | 135.67 KB | 78.14 KB | -42.4% |
| Total JS, raw | 666.39 KB | 486.44 KB | -27.0% |
| Total JS, gzip | 207.13 KB | 149.76 KB | -27.7% |
| Total CSS, raw | 65.13 KB | 77.73 KB | +19.4% |
| Total CSS, gzip | 11.76 KB | 14.80 KB | +25.8% |
| Vite transformed modules | 6,613 | 873 | -86.8% |

Svelte reduces JavaScript materially. CSS grows because shadcn-svelte/Bits UI state selectors and source-owned primitives replace React Radix runtime code.

## Windows runtime result

Pending Windows continuation. Run:

```powershell
bun run benchmark:windows
```

Harness builds both refs in isolated worktrees, performs three warmups and 30 alternating paired runs, then writes `benchmark-results/frontend-migration.json` and Markdown. Hard gate covers initial JavaScript, FCP, app-ready time, working-set memory, and p95 regression.
