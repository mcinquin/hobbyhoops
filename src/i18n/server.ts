import { cache } from "react";
import { cookies } from "next/headers";
import {
  createTranslator,
  type Translator,
} from "./translator";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "./config";

export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

export const getTranslations = cache(async (): Promise<{
  locale: Locale;
  t: Translator;
}> => {
  const locale = await getLocale();
  return {
    locale,
    t: createTranslator(locale),
  };
});
