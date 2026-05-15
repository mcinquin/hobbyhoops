import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import type { Locale } from "./config";

export type Messages = typeof fr;

const catalogs: Record<Locale, Messages> = { fr, en };

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}
