import i18n from "i18next"

import registryData from "../../locale-registry.json"

export type LocaleDirection = "ltr" | "rtl"

export type LocaleInfo = {
  tag: string
  nativeName: string
  englishName: string
  direction: LocaleDirection
  contributors: string[]
  ui: boolean
  rpc: boolean
}

type Registry = {
  fallbackLocale: string
  locales: LocaleInfo[]
}

const registry = registryData as Registry
const modules = import.meta.glob("../locales/ui/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Record<string, unknown>>

const resources = Object.fromEntries(
  Object.entries(modules)
    .filter(([path]) => !path.endsWith("/_template.json"))
    .map(([path, translation]) => {
      const tag = path.split("/").pop()?.replace(/\.json$/, "") ?? ""
      return [tag, { translation }]
    }),
)

export const FALLBACK_LOCALE = registry.fallbackLocale
export const locales = registry.locales
export const uiLocales = locales.filter((locale) => locale.ui)
export const rpcLocales = locales.filter((locale) => locale.rpc)

export function resolveLocale(
  candidates: readonly string[],
  kind: "ui" | "rpc",
): string {
  const available = (kind === "ui" ? uiLocales : rpcLocales).map(
    (locale) => locale.tag,
  )
  for (const candidate of candidates) {
    let canonical = candidate
    try {
      canonical = Intl.getCanonicalLocales(candidate)[0] ?? candidate
    } catch {
      continue
    }
    const exact = available.find(
      (locale) => locale.toLowerCase() === canonical.toLowerCase(),
    )
    if (exact) return exact
    const language = canonical.split("-")[0]?.toLowerCase()
    const regional = available.find(
      (locale) => locale.split("-")[0]?.toLowerCase() === language,
    )
    if (regional) return regional
  }
  return FALLBACK_LOCALE
}

export function detectedLocale(kind: "ui" | "rpc") {
  return resolveLocale(navigator.languages, kind)
}

export function localeInfo(tag: string) {
  return locales.find((locale) => locale.tag === tag) ?? locales[0]
}

export async function applyUiLocale(tag: string) {
  const resolved = resolveLocale([tag], "ui")
  const info = localeInfo(resolved)
  await i18n.changeLanguage(resolved)
  document.documentElement.lang = resolved
  document.documentElement.dir = info?.direction ?? "ltr"
  return resolved
}

void i18n.init({
  resources,
  lng: FALLBACK_LOCALE,
  fallbackLng: FALLBACK_LOCALE,
  supportedLngs: uiLocales.map((locale) => locale.tag),
  load: "currentOnly",
  interpolation: { escapeValue: false },
  returnEmptyString: false,
})

export default i18n
