import { describe, expect, it } from "vitest"
import { FALLBACK_LOCALE, resolveLocale } from "@/lib/i18n"

describe("resolveLocale", () => {
  it("uses exact and language RPC matches", () => {
    expect(resolveLocale(["pt-BR"], "rpc")).toBe("pt-BR")
    expect(resolveLocale(["de-AT"], "rpc")).toBe("de-DE")
  })

  it("falls back for unsupported or malformed values", () => {
    expect(resolveLocale(["not_a_locale", "xx-XX"], "ui")).toBe(FALLBACK_LOCALE)
  })
})
