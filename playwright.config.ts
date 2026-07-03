import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  workers: 1,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:1420",
    colorScheme: "dark",
    reducedMotion: "reduce",
  },
  webServer: {
    command: "VITE_UI_FIXTURE=true bun run dev --host 127.0.0.1",
    url: "http://127.0.0.1:1420",
    reuseExistingServer: false,
  },
})
