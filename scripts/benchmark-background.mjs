import { execFileSync, spawn } from "node:child_process"
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((value, index, all) =>
      value.startsWith("--")
        ? [
            value.slice(2),
            all[index + 1]?.startsWith("--") ? true : all[index + 1],
          ]
        : null,
    )
    .filter(Boolean),
)
const exe = path.resolve(
  String(args.exe ?? "src-rs/target/release/radianite.exe"),
)
const settleMs = Number(args.settle ?? 60_000)
const sampleSeconds = Number(args.samples ?? 30)
const output = path.resolve(
  String(args.output ?? "benchmark-results/background-mode.json"),
)
const logicalProcessors = Number(process.env.NUMBER_OF_PROCESSORS ?? 1)

if (process.platform !== "win32") {
  throw new Error("Background benchmark requires Windows")
}
await stat(exe).catch(() => {
  throw new Error(`Release executable not found: ${exe}`)
})
const runningRadianite = execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    "@(Get-Process -Name radianite -ErrorAction SilentlyContinue).Count",
  ],
  { encoding: "utf8" },
).trim()
if (Number(runningRadianite) > 0) {
  throw new Error("Close all running Radianite processes before benchmarking")
}

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  method: { settleMs, sampleSeconds, logicalProcessors },
  gui: await measureMode("gui", []),
  background: await measureMode("background", ["--background"]),
}
result.gate = {
  maxWorkingSetBytes: 20 * 1024 * 1024,
  maxCpuPercent: 0.2,
  requiresZeroWebviewProcesses: true,
}
result.gate.failures = [
  ...(result.background.workingSetMedianBytes > result.gate.maxWorkingSetBytes
    ? ["background working set exceeds 20 MB"]
    : []),
  ...(result.background.cpuPercent > result.gate.maxCpuPercent
    ? ["background CPU exceeds 0.2%"]
    : []),
  ...(result.background.maxWebviewProcesses > 0
    ? ["background mode created a WebView2 process"]
    : []),
]
result.gate.passed = result.gate.failures.length === 0

await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`)
await writeFile(output.replace(/\.json$/i, ".md"), markdown(result))
console.log(`Wrote ${output}`)
console.log(`Background resource gate: ${result.gate.passed ? "PASS" : "FAIL"}`)
if (!result.gate.passed) process.exitCode = 1

async function measureMode(name, launchArgs) {
  const profile = await mkdtemp(path.join(tmpdir(), `radianite-${name}-`))
  const child = spawn(exe, launchArgs, {
    env: {
      ...process.env,
      APPDATA: path.join(profile, "Roaming"),
      LOCALAPPDATA: path.join(profile, "Local"),
      RADIANITE_RESOURCE_BENCHMARK: "1",
    },
    stdio: "ignore",
    windowsHide: false,
  })

  try {
    await waitForProcess(child)
    await delay(settleMs)
    const first = processTree(child.pid)
    const samples = []
    for (let index = 0; index < sampleSeconds; index += 1) {
      samples.push(processTree(child.pid))
      await delay(1_000)
    }
    const last = processTree(child.pid)
    const elapsedSeconds = Math.max(sampleSeconds, 1)
    const cpuSeconds = Math.max(
      0,
      (last.totalCpu100ns - first.totalCpu100ns) / 10_000_000,
    )
    const workingSets = samples
      .map((sample) => sample.workingSetBytes)
      .sort((a, b) => a - b)

    return {
      workingSetMedianBytes: percentile(workingSets, 0.5),
      workingSetP95Bytes: percentile(workingSets, 0.95),
      cpuPercent: (cpuSeconds / elapsedSeconds / logicalProcessors) * 100,
      maxProcessCount: Math.max(...samples.map((sample) => sample.processCount)),
      maxWebviewProcesses: Math.max(
        ...samples.map((sample) => sample.webviewProcesses),
      ),
    }
  } finally {
    if (child.pid) {
      try {
        execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
        })
      } catch {}
    }
    await rm(profile, { recursive: true, force: true })
    await delay(1_000)
  }
}

function processTree(rootPid) {
  const script = `$p=Get-CimInstance Win32_Process; $ids=@(${rootPid}); do {$n=@($p|Where-Object {$ids -contains $_.ParentProcessId}|Select-Object -Expand ProcessId); $new=@($n|Where-Object {$ids -notcontains $_}); $ids+=$new} while($new.Count); @($p|Where-Object {$ids -contains $_.ProcessId}|Select-Object ProcessId,Name,WorkingSetSize,KernelModeTime,UserModeTime)|ConvertTo-Json -Compress`
  const raw = execFileSync(
    "powershell",
    ["-NoProfile", "-Command", script],
    { encoding: "utf8" },
  ).trim()
  const processes = raw ? [JSON.parse(raw)].flat() : []
  if (!processes.some((entry) => Number(entry.ProcessId) === rootPid)) {
    throw new Error(`Radianite ${rootPid} exited during the benchmark`)
  }
  return {
    workingSetBytes: processes.reduce(
      (sum, entry) => sum + Number(entry.WorkingSetSize ?? 0),
      0,
    ),
    totalCpu100ns: processes.reduce(
      (sum, entry) =>
        sum +
        Number(entry.KernelModeTime ?? 0) +
        Number(entry.UserModeTime ?? 0),
      0,
    ),
    processCount: processes.length,
    webviewProcesses: processes.filter((entry) =>
      String(entry.Name).toLowerCase().includes("msedgewebview2"),
    ).length,
  }
}

async function waitForProcess(child) {
  await Promise.race([
    delay(2_000),
    new Promise((_, reject) =>
      child.once("exit", (code) =>
        reject(new Error(`Radianite exited during startup with code ${code}`)),
      ),
    ),
  ])
}

function percentile(values, point) {
  return values[Math.min(values.length - 1, Math.ceil(values.length * point) - 1)]
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(2)
}

function markdown(data) {
  return `# Background Mode Benchmark

Generated: ${data.generatedAt}

| Mode | Median working set | P95 working set | Average CPU | Max processes | WebView2 processes |
|---|---:|---:|---:|---:|---:|
| GUI | ${mb(data.gui.workingSetMedianBytes)} MB | ${mb(data.gui.workingSetP95Bytes)} MB | ${data.gui.cpuPercent.toFixed(3)}% | ${data.gui.maxProcessCount} | ${data.gui.maxWebviewProcesses} |
| Background | ${mb(data.background.workingSetMedianBytes)} MB | ${mb(data.background.workingSetP95Bytes)} MB | ${data.background.cpuPercent.toFixed(3)}% | ${data.background.maxProcessCount} | ${data.background.maxWebviewProcesses} |

Gate: **${data.gate.passed ? "PASS" : "FAIL"}**
${data.gate.failures.map((failure) => `- ${failure}`).join("\n")}
`
}
