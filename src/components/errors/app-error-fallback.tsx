"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

interface AppErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  titleKey?: string;
}

export function AppErrorFallback({
  error,
  reset,
  titleKey = "errors.pageError",
}: AppErrorFallbackProps) {
  const t = useTranslations();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4 py-20 text-center">
      <h1 className="text-lg font-semibold">{t(titleKey)}</h1>
      <p className="text-sm text-muted-foreground">{t("errors.pageErrorHint")}</p>
      <Button variant="outline" size="sm" onClick={reset}>
        {t("common.retry")}
      </Button>
    </div>
  );
}
