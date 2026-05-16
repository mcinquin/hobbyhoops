"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface AdminFeedbackProps {
  success?: string | null;
  error?: string | null;
  onSuccessDismiss?: () => void;
}

export function AdminFeedback({
  success,
  error,
  onSuccessDismiss,
}: AdminFeedbackProps) {
  useEffect(() => {
    if (!success || !onSuccessDismiss) return;
    const timeout = window.setTimeout(onSuccessDismiss, 4000);
    return () => window.clearTimeout(timeout);
  }, [onSuccessDismiss, success]);

  const message = error ?? success;
  if (!message) return null;

  return (
    <p
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        error
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      )}
      role={error ? "alert" : "status"}
    >
      {message}
    </p>
  );
}
