import type { TFunction } from "i18next"

import type { LocalizedMessage } from "@/lib/types"

export function translateMessage(t: TFunction, message: LocalizedMessage) {
  const translated = t(message.key, message.args ?? {})
  if (!message.detail) return translated
  if (translated === message.key) return message.detail
  return t("errors.withDetail", { message: translated, detail: message.detail })
}
