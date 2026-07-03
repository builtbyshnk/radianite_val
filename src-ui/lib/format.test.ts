import { describe, expect, it } from "vitest"
import { formatUptime, labelize } from "@/lib/format"

describe("format helpers", () => {
  it("formats uptime without locale-dependent output", () => {
    expect(formatUptime(3_661_000)).toBe("01:01:01")
  })

  it("turns enum-like names into labels", () => {
    expect(labelize("valorantReady")).toBe("Valorant Ready")
  })
})
