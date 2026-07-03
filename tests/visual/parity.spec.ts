import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import path from "node:path"

const sizes = [
  { name: "default", width: 1152, height: 768 },
  { name: "minimum", width: 1024, height: 600 },
] as const

const baselineDir = path.resolve("tests/visual/baseline")

async function ready(page: Page, fixture: string) {
  await page.goto(`/?fixture=${fixture}`)
  const veil = page.locator(".startup-veil")
  await expect(veil).toHaveClass(fixture === "startup" ? /startup-veil-visible/ : /startup-veil-hidden/)
}

async function capture(page: Page, name: string) {
  await page.screenshot({ path: path.join(baselineDir, `${name}.png`), animations: "disabled" })
}

test.beforeAll(async () => mkdir(baselineDir, { recursive: true }))

for (const size of sizes) {
  test(`capture React parity states at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size)

    for (const fixture of ["startup", "disconnected", "menus", "matchmaking", "live"]) {
      await ready(page, fixture)
      await capture(page, `${size.name}-${fixture}`)
    }

    await ready(page, "disconnected")
    await page.getByRole("button", { name: "Check for updates" }).click()
    await expect(page.getByText("v0.2.0", { exact: true })).toBeVisible()
    await capture(page, `${size.name}-update`)

    await ready(page, "disconnected")
    await page.getByRole("button", { name: "Open settings" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await capture(page, `${size.name}-settings-general`)
    for (const [tab, slug] of [["Overlay", "overlay"], ["Discord RPC", "discord"], ["About", "about"]] as const) {
      await page.getByRole("button", { name: tab, exact: true }).click()
      await capture(page, `${size.name}-settings-${slug}`)
    }

    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click()
    await page.getByRole("button", { name: "Check for updates" }).click()
    await page.getByRole("button", { name: "Latest version v0.2.0" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await capture(page, `${size.name}-release-notes`)
  })
}
