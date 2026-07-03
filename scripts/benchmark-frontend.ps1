param(
  [string]$BaselineRef = "6ea1805",
  [string]$CandidateRef = "HEAD",
  [int]$Runs = 30,
  [int]$Warmups = 3
)

$ErrorActionPreference = "Stop"
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw "Run this benchmark on Windows 10 or Windows 11." }
if (Get-Process -Name "RiotClientServices", "VALORANT-Win64-Shipping", "Discord", "Radianite" -ErrorAction SilentlyContinue) {
  throw "Close Riot Client, VALORANT, Discord, and Radianite before benchmarking."
}

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("radianite-benchmark-" + [guid]::NewGuid())
$baseline = Join-Path $temp "react"
$candidate = Join-Path $temp "svelte"
$output = Join-Path $repo "benchmark-results\frontend-migration.json"
$tauriConfig = Join-Path $repo "scripts\benchmark-tauri.conf.json"

try {
  git -C $repo worktree add --detach $baseline $BaselineRef
  if ($LASTEXITCODE -ne 0) { throw "Failed to create baseline worktree." }
  git -C $repo worktree add --detach $candidate $CandidateRef
  if ($LASTEXITCODE -ne 0) { throw "Failed to create candidate worktree." }
  foreach ($worktree in @($baseline, $candidate)) {
    Push-Location $worktree
    try {
      bun install --frozen-lockfile
      if ($LASTEXITCODE -ne 0) { throw "Dependency install failed in $worktree." }
      bun run build
      if ($LASTEXITCODE -ne 0) { throw "Frontend build failed in $worktree." }
      bun run tauri build --bundles nsis --config $tauriConfig --ci --no-sign
      if ($LASTEXITCODE -ne 0) { throw "Tauri build failed in $worktree." }
    }
    finally {
      Pop-Location
    }
  }

  $baselineExe = Join-Path $baseline "src-rs\target\release\radianite.exe"
  $candidateExe = Join-Path $candidate "src-rs\target\release\radianite.exe"
  node (Join-Path $repo "scripts\benchmark-frontend.mjs") `
    --baseline-ref $BaselineRef --candidate-ref $CandidateRef `
    --baseline-root $baseline --candidate-root $candidate `
    --baseline-exe $baselineExe --candidate-exe $candidateExe `
    --runs $Runs --warmups $Warmups --output $output
  if ($LASTEXITCODE -ne 0) { throw "Benchmark measurement failed." }
  Write-Host "Raw result: $output"
  Write-Host "Report: $($output -replace '\.json$', '.md')"
}
finally {
  git -C $repo worktree remove --force $baseline 2>$null
  git -C $repo worktree remove --force $candidate 2>$null
  Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
}
