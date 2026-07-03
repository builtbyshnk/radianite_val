import { defineConfig } from "vitest/config"
import { svelte } from "@sveltejs/vite-plugin-svelte"

export default defineConfig({
  plugins: [svelte()],
  resolve: { alias: { "@": "/src-ui" } },
  test: { environment: "jsdom", include: ["src-ui/**/*.test.ts"] },
})
