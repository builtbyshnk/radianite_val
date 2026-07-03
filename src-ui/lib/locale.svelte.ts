import i18n from "@/lib/i18n"

class LocaleState {
  revision = $state(0)

  constructor() {
    i18n.on("languageChanged", () => { this.revision += 1 })
  }

  t(key: string, options?: Record<string, unknown>) {
    this.revision
    return String(i18n.t(key, options))
  }
}

export const locale = new LocaleState()
