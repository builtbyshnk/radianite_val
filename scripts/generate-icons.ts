import { execFileSync } from "node:child_process"
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import process from "node:process"

const output = mkdtempSync(path.join(tmpdir(), "radianite-icons-"))

try {
  execFileSync(
    process.execPath,
    ["run", "tauri", "icon", "src-rs/icons/icon.svg", "--output", output],
    { stdio: "inherit" },
  )

  // Copy desktop exports only; this app does not ship mobile icon sets.
  for (const file of readdirSync(output, { withFileTypes: true })) {
    if (file.isFile()) {
      copyFileSync(path.join(output, file.name), `src-rs/icons/${file.name}`)
    }
  }

  execFileSync(
    process.execPath,
    [
      "run",
      "tauri",
      "icon",
      "src-rs/icons/icon.svg",
      "--output",
      output,
      "--png",
      "180",
      "--png",
      "1024",
    ],
    { stdio: "inherit" },
  )

  copyFileSync("src-rs/icons/128x128.png", "src-ui/assets/app-icon.png")
  copyFileSync("src-rs/icons/128x128.png", "public/app-icon.png")
  copyFileSync("src-rs/icons/icon.ico", "public/favicon.ico")
  copyFileSync("src-rs/icons/icon.svg", "public/favicon.svg")
  copyFileSync("src-rs/icons/128x128@2x.png", "docs/assets/radianite-logo.png")
  copyFileSync("src-rs/icons/icon.ico", "docs/assets/favicon.ico")
  copyFileSync("src-rs/icons/icon.svg", "docs/assets/favicon.svg")
  copyFileSync("src-rs/icons/32x32.png", "docs/assets/favicon-32x32.png")
  copyFileSync(
    path.join(output, "180x180.png"),
    "docs/assets/apple-touch-icon.png",
  )
  mkdirSync("assets/branding", { recursive: true })
  copyFileSync(
    path.join(output, "1024x1024.png"),
    "assets/branding/radianite.png",
  )
} finally {
  rmSync(output, { recursive: true, force: true })
}
