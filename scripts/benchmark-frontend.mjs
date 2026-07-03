import { brotliCompressSync, gzipSync } from "node:zlib"
import { execFileSync, spawn } from "node:child_process"
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { chromium } from "@playwright/test"

const args = Object.fromEntries(process.argv.slice(2).map((value, index, all) => value.startsWith("--") ? [value.slice(2), all[index + 1]?.startsWith("--") ? true : all[index + 1]] : null).filter(Boolean))
const runs = Number(args.runs ?? 30)
const warmups = Number(args.warmups ?? 3)
const settleMs = Number(args.settle ?? 5000)
const output = path.resolve(String(args.output ?? "benchmark-results/frontend-migration.json"))

if (process.platform !== "win32") throw new Error("Runtime benchmark requires Windows")
for (const required of ["baseline-root", "candidate-root", "baseline-exe", "candidate-exe"]) if (!args[required]) throw new Error(`Missing --${required}`)

const variants = {
  react: { ref: String(args["baseline-ref"] ?? "6ea1805"), root: path.resolve(String(args["baseline-root"])), exe: path.resolve(String(args["baseline-exe"])) },
  svelte: { ref: String(args["candidate-ref"] ?? "HEAD"), root: path.resolve(String(args["candidate-root"])), exe: path.resolve(String(args["candidate-exe"])) },
}

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  machine: { platform: process.platform, arch: process.arch, node: process.version, webview2: readWebViewVersion() },
  method: { warmups, runs, settleMs, ordering: "paired alternating A/B then B/A", appReadySelector: ".startup-veil-hidden" },
  variants: {},
  runtime: { react: [], svelte: [] },
}

for (const [name, variant] of Object.entries(variants)) result.variants[name] = { ref: variant.ref, assets: await analyzeAssets(variant.root), executableBytes: await size(variant.exe), installerBytes: await findInstallerSize(variant.root) }

for (let index = 0; index < warmups; index += 1) {
  await measureOnce(variants.react, `warm-react-${index}`, settleMs)
  await measureOnce(variants.svelte, `warm-svelte-${index}`, settleMs)
}

for (let index = 0; index < runs; index += 1) {
  const order = index % 2 === 0 ? ["react", "svelte"] : ["svelte", "react"]
  for (const name of order) result.runtime[name].push(await measureOnce(variants[name], `${name}-${index}`, settleMs))
}

result.summary = Object.fromEntries(Object.entries(result.runtime).map(([name, samples]) => [name, summarize(samples)]))
result.gate = evaluateGate(result)
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`)
await writeFile(output.replace(/\.json$/i, ".md"), markdown(result))
console.log(`Wrote ${output}`)
console.log(`Performance gate: ${result.gate.passed ? "PASS" : "FAIL"}`)

async function measureOnce(variant, runName, delay) {
  const port = 9300 + Math.floor(Math.random() * 500)
  const userData = path.join(tmpdir(), `radianite-bench-${runName}`)
  await rm(userData, { recursive: true, force: true })
  const started = Date.now()
  const child = spawn(variant.exe, [], { env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}`, WEBVIEW2_USER_DATA_FOLDER: userData }, stdio: "ignore", windowsHide: false })
  let browser
  try {
    const endpoint = await waitForEndpoint(port, 30_000)
    browser = await chromium.connectOverCDP(endpoint)
    const page = browser.contexts().flatMap((context) => context.pages())[0]
    if (!page) throw new Error("WebView2 target not found")
    await page.locator(".startup-veil-hidden").waitFor({ state: "attached", timeout: 30_000 })
    const appReadyMs = Date.now() - started
    const performance = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0]
      const fcp = performance.getEntriesByName("first-contentful-paint")[0]
      return { fcpMs: fcp?.startTime ?? null, domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? null, loadMs: navigation?.loadEventEnd ?? null }
    })
    await new Promise((resolve) => setTimeout(resolve, delay))
    return { ...performance, appReadyMs, workingSetBytes: processTreeWorkingSet(child.pid) }
  } finally {
    await browser?.close().catch(() => undefined)
    if (child.pid) { try { execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" }) } catch {} }
    await rm(userData, { recursive: true, force: true })
  }
}

async function waitForEndpoint(port, timeout) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    try { const response = await fetch(`http://127.0.0.1:${port}/json/version`); if (response.ok) return (await response.json()).webSocketDebuggerUrl }
    catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`WebView2 CDP port ${port} did not open`)
}

function processTreeWorkingSet(rootPid) {
  const script = `$p=Get-CimInstance Win32_Process; $ids=@(${rootPid}); do {$n=@($p|Where-Object {$ids -contains $_.ParentProcessId}|Select-Object -Expand ProcessId); $new=@($n|Where-Object {$ids -notcontains $_}); $ids+=$new} while($new.Count); ($p|Where-Object {$ids -contains $_.ProcessId}|Measure-Object WorkingSetSize -Sum).Sum`
  return Number(execFileSync("powershell", ["-NoProfile", "-Command", script], { encoding: "utf8" }).trim())
}

async function analyzeAssets(root) {
  const dist = path.join(root, "dist")
  const files = await walk(dist)
  const assets = { totalBytes: 0, js: aggregate(), css: aggregate(), initialJs: aggregate() }
  const html = await readFile(path.join(dist, "index.html"), "utf8")
  for (const file of files) {
    const data = await readFile(file); assets.totalBytes += data.length
    const relative = path.relative(dist, file).replaceAll("\\", "/")
    if (file.endsWith(".js")) add(assets.js, data)
    if (file.endsWith(".css")) add(assets.css, data)
    if (file.endsWith(".js") && html.includes(relative)) add(assets.initialJs, data)
  }
  return assets
}
function aggregate() { return { files: 0, rawBytes: 0, gzipBytes: 0, brotliBytes: 0 } }
function add(target, data) { target.files += 1; target.rawBytes += data.length; target.gzipBytes += gzipSync(data, { level: 9 }).length; target.brotliBytes += brotliCompressSync(data).length }
async function walk(directory) { const output = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const value = path.join(directory, entry.name); if (entry.isDirectory()) output.push(...await walk(value)); else output.push(value) } return output }
async function size(file) { return (await stat(file)).size }
async function findInstallerSize(root) { const bundle = path.join(root, "src-rs", "target", "release", "bundle", "nsis"); try { const files = (await walk(bundle)).filter((file) => file.endsWith(".exe")); return files.length ? Math.max(...await Promise.all(files.map(size))) : null } catch { return null } }

function summarize(samples) {
  const keys = ["fcpMs", "domContentLoadedMs", "loadMs", "appReadyMs", "workingSetBytes"]
  return Object.fromEntries(keys.map((key) => { const values = samples.map((sample) => sample[key]).filter(Number.isFinite).sort((a, b) => a - b); return [key, { median: percentile(values, .5), p95: percentile(values, .95) }] }))
}
function percentile(values, point) { if (!values.length) return null; return values[Math.min(values.length - 1, Math.ceil(values.length * point) - 1)] }
function evaluateGate(data) {
  const failures = []
  const reactAssets = data.variants.react.assets.initialJs, svelteAssets = data.variants.svelte.assets.initialJs
  for (const key of ["rawBytes", "gzipBytes"]) if (!(svelteAssets[key] < reactAssets[key])) failures.push(`initialJs.${key} did not improve`)
  for (const key of ["fcpMs", "appReadyMs", "workingSetBytes"]) {
    const react = data.summary.react[key], svelte = data.summary.svelte[key]
    if (!(svelte.median < react.median)) failures.push(`${key} median did not improve`)
    if (svelte.p95 > react.p95 * 1.05) failures.push(`${key} p95 regressed over 5%`)
  }
  return { passed: failures.length === 0, failures }
}
function delta(before, after) { return before ? `${((after - before) / before * 100).toFixed(2)}%` : "n/a" }
function markdown(data) { const a=data.variants.react.assets,b=data.variants.svelte.assets; return `# Frontend Migration Benchmark\n\nGenerated: ${data.generatedAt}\n\n| Metric | React | Svelte | Delta |\n|---|---:|---:|---:|\n| Initial JS raw | ${a.initialJs.rawBytes} | ${b.initialJs.rawBytes} | ${delta(a.initialJs.rawBytes,b.initialJs.rawBytes)} |\n| Initial JS gzip | ${a.initialJs.gzipBytes} | ${b.initialJs.gzipBytes} | ${delta(a.initialJs.gzipBytes,b.initialJs.gzipBytes)} |\n| Total JS raw | ${a.js.rawBytes} | ${b.js.rawBytes} | ${delta(a.js.rawBytes,b.js.rawBytes)} |\n| FCP median (ms) | ${data.summary.react.fcpMs.median} | ${data.summary.svelte.fcpMs.median} | ${delta(data.summary.react.fcpMs.median,data.summary.svelte.fcpMs.median)} |\n| App ready median (ms) | ${data.summary.react.appReadyMs.median} | ${data.summary.svelte.appReadyMs.median} | ${delta(data.summary.react.appReadyMs.median,data.summary.svelte.appReadyMs.median)} |\n| Working set median (bytes) | ${data.summary.react.workingSetBytes.median} | ${data.summary.svelte.workingSetBytes.median} | ${delta(data.summary.react.workingSetBytes.median,data.summary.svelte.workingSetBytes.median)} |\n\nGate: **${data.gate.passed ? "PASS" : "FAIL"}**\n${data.gate.failures.map((failure) => `- ${failure}`).join("\n")}\n` }
function readWebViewVersion() { try { return execFileSync("powershell", ["-NoProfile", "-Command", "(Get-ItemProperty 'HKCU:\\Software\\Microsoft\\EdgeUpdate\\Clients\\{F1E7E4F1-7A2A-4A8C-BE3C-6B4F5F1F4A7A}' -ErrorAction SilentlyContinue).pv"], { encoding: "utf8" }).trim() || null } catch { return null } }
