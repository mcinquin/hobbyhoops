"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/i18n/client";

interface BatchTextImportProps {
  label: string;
  description: string;
  placeholder: string;
  disabled?: boolean;
  onSubmit: (text: string) => Promise<void>;
}

export function BatchTextImport({
  label,
  description,
  placeholder,
  disabled,
  onSubmit,
}: BatchTextImportProps) {
  const t = useTranslations();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!text.trim()) {
      setError(t("admin.batch.empty"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(text);
      setText("");
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : t("errors.updateFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || loading}
        className="min-h-32 font-mono text-xs"
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="button" size="sm" disabled={disabled || loading} onClick={() => void handleSubmit()}>
        {loading ? t("admin.batch.importPending") : t("admin.batch.importList")}
      </Button>
    </div>
  );
}
