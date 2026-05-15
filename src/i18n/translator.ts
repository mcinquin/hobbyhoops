import { getMessages } from "./messages";
import type { Locale } from "./config";

export function createTranslator(locale: Locale) {
  const messages = getMessages(locale);

  return function t(
    key: string,
    params?: Record<string, string | number>
  ): string {
    const parts = key.split(".");
    let cur: unknown = messages;
    for (const part of parts) {
      if (cur && typeof cur === "object" && part in cur) {
        cur = (cur as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    if (typeof cur !== "string") return key;

    let result = cur;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        result = result.replaceAll(`{${name}}`, String(value));
      }
    }
    return result;
  };
}

export type Translator = ReturnType<typeof createTranslator>;
