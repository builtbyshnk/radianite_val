import { describe, expect, it } from "vitest"
import { formatUptime, labelize, queueLabel, regionLabel } from "@/lib/format"

describe("format helpers", () => {
  it("expands region codes and preserves unknown regions", () => {
    expect(regionLabel("AP")).toBe("Asia Pacific")
    expect(regionLabel("na")).toBe("North America")
    expect(regionLabel("eu")).toBe("Europe")
    expect(regionLabel("kr")).toBe("South Korea")
    expect(regionLabel("br")).toBe("Brazil")
    expect(regionLabel("latam")).toBe("Latin America")
    expect(regionLabel("pbe")).toBe("Public Beta Environment")
    expect(regionLabel("cn")).toBe("China")
    expect(regionLabel("test")).toBe("TEST")
    expect(regionLabel(null)).toBeNull()
  })

  it("formats uptime without locale-dependent output", () => {
    expect(formatUptime(3_661_000)).toBe("01:01:01")
  })

  it("turns enum-like names into labels", () => {
    expect(labelize("valorantReady")).toBe("Valorant Ready")
  })

  it("labels the Gauntlet queue with its public mode name", () => {
    expect(queueLabel("abilitydraftarena", "abilitydraftarena")).toBe(
      "Gauntlet: Glitched",
    )
    expect(queueLabel("ABILITYDRAFTARENA")).toBe("Gauntlet: Glitched")
  })
})
