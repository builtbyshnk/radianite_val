import { expect, test, type Page } from "@playwright/test"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import pixelmatch from "pixelmatch"
import { PNG } from "pngjs"

const sizes = [
  { name: "default", width: 1152, height: 768 },
  { name: "minimum", width: 1024, height: 600 },
] as const

const baselineDir = path.resolve("tests/visual/baseline")

async function ready(page: Page, fixture: string) {
  await page.goto(`/?fixture=${fixture}`)
  await page.addStyleTag({ content: "iframe { opacity: 0 !important; }" })
  const veil = page.locator(".startup-veil")
  await expect(veil).toHaveClass(
    fixture === "startup" ? /startup-veil-visible/ : /startup-veil-hidden/,
  )
}

async function capture(page: Page, name: string) {
  await page.waitForTimeout(150)
  const actualBuffer = await page.screenshot({ animations: "disabled" })
  const expected = PNG.sync.read(
    await readFile(path.join(baselineDir, `${name}.png`)),
  )
  const actual = PNG.sync.read(actualBuffer)
  if (name.includes("settings-") || name.includes("release-notes")) {
    const box = await page.getByRole("dialog").boundingBox()
    if (box) {
      for (let y = 0; y < actual.height; y += 1) {
        for (let x = 0; x < actual.width; x += 1) {
          if (
            x < box.x ||
            x > box.x + box.width ||
            y < box.y ||
            y > box.y + box.height
          ) {
            const offset = (y * actual.width + x) * 4
            expected.data.copy(actual.data, offset, offset, offset + 4)
          }
        }
      }
    }
  }
  const diff = new PNG({ width: expected.width, height: expected.height })
  const changed = pixelmatch(
    expected.data,
    actual.data,
    diff.data,
    expected.width,
    expected.height,
    { threshold: 0.1 },
  )
  const ratio = changed / (expected.width * expected.height)
  if (ratio > 0.001) {
    const output = path.resolve("test-results", "visual-diffs")
    await mkdir(output, { recursive: true })
    await writeFile(path.join(output, `${name}-actual.png`), actualBuffer)
    await writeFile(path.join(output, `${name}-diff.png`), PNG.sync.write(diff))
  }
  expect(
    ratio,
    `${name} changed ${(ratio * 100).toFixed(3)}%`,
  ).toBeLessThanOrEqual(0.001)
}

test.beforeAll(async () => mkdir(baselineDir, { recursive: true }))

for (const size of sizes) {
  test(`capture React parity states at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    await page.clock.install({ time: new Date("2026-01-15T12:00:01.000Z") })

    for (const fixture of [
      "startup",
      "disconnected",
      "menus",
      "matchmaking",
      "live",
    ]) {
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
    for (const [tab, slug] of [
      ["Overlay", "overlay"],
      ["Discord RPC", "discord"],
      ["About", "about"],
    ] as const) {
      await page.getByRole("button", { name: tab, exact: true }).click()
      await capture(page, `${size.name}-settings-${slug}`)
    }

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close" })
      .click()
    await page.getByRole("button", { name: "Check for updates" }).click()
    await page.getByRole("button", { name: "Latest version v0.2.0" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(
      page.getByText("Faster startup", { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "View on GitHub" }),
    ).toBeVisible()
    await capture(page, `${size.name}-release-notes`)
  })
}
