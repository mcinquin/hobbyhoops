import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import type { Locale } from "./config";

type Messages = typeof fr;

const catalogs: Record<Locale, Messages> = { fr, en };

/** Message catalogue for a locale. */
export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}
