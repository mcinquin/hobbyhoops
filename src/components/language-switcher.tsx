"use client";

import { LOCALES } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={cn("space-y-1.5", className)}
      role="group"
      aria-label={t("locale.label")}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {t("locale.label")}
      </p>
      <div className="flex gap-1">
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => void setLocale(code)}
            aria-pressed={locale === code}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              locale === code
                ? "bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/40"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {t(`locale.${code}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
