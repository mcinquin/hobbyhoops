"use client";

import { AppErrorFallback } from "@/components/errors/app-error-fallback";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppErrorFallback
      error={error}
      reset={reset}
      titleKey="admin.errorTitle"
    />
  );
}
