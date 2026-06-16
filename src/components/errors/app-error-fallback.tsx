"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getClientLogger } from "@/lib/client-logger";
import { useTranslations } from "@/i18n/client";

const errorLogger = getClientLogger("error-boundary");

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
    errorLogger.error({
      msg: "Page error",
      err: error,
      ...(error.digest ? { digest: error.digest } : {}),
    });
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
