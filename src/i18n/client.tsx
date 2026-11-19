"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { type Locale } from "./config";
import { createTranslator, type Translator } from "./translator";

type I18nContextValue = {
  locale: Locale;
  t: Translator;
  setLocale: (locale: Locale) => Promise<void>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

/** Provides the locale and its translator to client components. */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const t = useMemo(() => createTranslator(locale), [locale]);

  const setLocale = useCallback(
    async (nextLocale: Locale) => {
      if (nextLocale === locale || isPending) return;
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ locale: nextLocale }),
      });
      startTransition(() => {
        router.refresh();
      });
    },
    [isPending, locale, router]
  );

  const value = useMemo(
    () => ({ locale, t, setLocale }),
    [locale, t, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Current locale and translator; must be used inside `LocaleProvider`. */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LocaleProvider");
  }
  return ctx;
}

/** Translator for the current locale. */
export function useTranslations(): Translator {
  return useI18n().t;
}
