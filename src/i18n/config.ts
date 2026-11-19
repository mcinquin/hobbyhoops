export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "hh_locale";

/** Type guard for supported locales. */
export function isLocale(value: string | undefined | null): value is Locale {
  return value === "fr" || value === "en";
}
