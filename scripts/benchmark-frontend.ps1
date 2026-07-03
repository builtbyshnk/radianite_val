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

try {
  git -C $repo worktree add --detach $baseline $BaselineRef
  git -C $repo worktree add --detach $candidate $CandidateRef
  foreach ($worktree in @($baseline, $candidate)) {
    Push-Location $worktree
    bun install --frozen-lockfile
    bun run build
    bun run tauri build --bundles nsis --config '{"bundle":{"createUpdaterArtifacts":false}}' --ci --no-sign
    Pop-Location
  }

  $baselineExe = Join-Path $baseline "src-rs\target\release\radianite.exe"
  $candidateExe = Join-Path $candidate "src-rs\target\release\radianite.exe"
  node (Join-Path $repo "scripts\benchmark-frontend.mjs") `
    --baseline-ref $BaselineRef --candidate-ref $CandidateRef `
    --baseline-root $baseline --candidate-root $candidate `
    --baseline-exe $baselineExe --candidate-exe $candidateExe `
    --runs $Runs --warmups $Warmups --output $output
  Write-Host "Raw result: $output"
  Write-Host "Report: $($output -replace '\.json$', '.md')"
}
finally {
  git -C $repo worktree remove --force $baseline 2>$null
  git -C $repo worktree remove --force $candidate 2>$null
  Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
}
