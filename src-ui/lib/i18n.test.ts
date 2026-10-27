import { afterEach, describe, expect, it } from "vitest"
import i18n, {
  applyUiLocale,
  FALLBACK_LOCALE,
  resolveLocale,
  uiLocales,
} from "@/lib/i18n"

describe("resolveLocale", () => {
  it("uses exact and language RPC matches", () => {
    expect(resolveLocale(["pt-BR"], "rpc")).toBe("pt-BR")
    expect(resolveLocale(["de-AT"], "rpc")).toBe("de-DE")
  })

  it("falls back for unsupported or malformed values", () => {
    expect(resolveLocale(["not_a_locale", "xx-XX"], "ui")).toBe(FALLBACK_LOCALE)
  })

  it("matches regional Windows languages to the supported app language", () => {
    expect(resolveLocale(["es-MX"], "ui")).toBe("es-ES")
    expect(resolveLocale(["fr-CA"], "ui")).toBe("fr-FR")
    expect(resolveLocale(["pt-PT"], "ui")).toBe("pt-BR")
    expect(resolveLocale(["ar-SA"], "ui")).toBe("ar-AE")
    expect(resolveLocale(["it-IT"], "ui")).toBe(FALLBACK_LOCALE)
  })
})

describe("app translations", () => {
  afterEach(() => applyUiLocale(FALLBACK_LOCALE))

  const titles = {
    "en-US": "Settings",
    "es-ES": "Ajustes",
    "fr-FR": "Paramètres",
    "de-DE": "Einstellungen",
    "pt-BR": "Configurações",
    "ru-RU": "Настройки",
    "hi-IN": "सेटिंग्स",
    "zh-CN": "设置",
    "ja-JP": "設定",
    "ko-KR": "설정",
    "ar-AE": "الإعدادات",
  }

  function flatten(
    tree: Record<string, unknown>,
    prefix = "",
  ): Record<string, string> {
    return Object.fromEntries(
      Object.entries(tree).flatMap(([key, value]) =>
        typeof value === "string"
          ? [[`${prefix}${key}`, value]]
          : Object.entries(
              flatten(value as Record<string, unknown>, `${prefix}${key}.`),
            ),
      ),
    )
  }

  it("provides a complete catalog for English and ten other app languages", () => {
    expect(uiLocales.map(({ tag }) => tag).sort()).toEqual(
      Object.keys(titles).sort(),
    )
    const fallback = flatten(
      i18n.getResourceBundle(FALLBACK_LOCALE, "translation"),
    )
    for (const { tag } of uiLocales) {
      const entries = flatten(i18n.getResourceBundle(tag, "translation"))
      expect(Object.keys(entries).sort(), tag).toEqual(
        Object.keys(fallback).sort(),
      )
      expect(
        Object.values(entries).every((value) => value.trim().length > 0),
        tag,
      ).toBe(true)
    }
  })

  it.each(Object.entries(titles))(
    "switches to %s with interpolation and direction",
    async (tag, title) => {
      await applyUiLocale(tag)
      expect(i18n.t("settings.title")).toBe(title)
      expect(i18n.t("updates.available", { version: "2.0" })).toContain("2.0")
      expect(i18n.t("match.tier", { tier: 12 })).toContain("12")
      expect(document.documentElement.lang).toBe(tag)
      expect(document.documentElement.dir).toBe(tag === "ar-AE" ? "rtl" : "ltr")
    },
  )
})
