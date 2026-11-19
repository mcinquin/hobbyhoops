import type { NextRequest } from "next/server";
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

function getLocaleFromRequest(request: NextRequest): Locale {
  const value = request.cookies.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Translator for the request's locale (API routes). */
export function getRequestTranslator(request: NextRequest): Translator {
  return createTranslator(getLocaleFromRequest(request));
}
