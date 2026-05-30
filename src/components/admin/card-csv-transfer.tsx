"use client";

import { useRef, useState } from "react";
import type { CollectionListQuery } from "@/lib/collection-query";
import type { CardCsvImportMode } from "@/lib/card-csv";
import {
  downloadCardsCsv,
  importCardsCsvFile,
} from "@/lib/cards-client";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Upload } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface CardCsvTransferProps {
  filters: CollectionListQuery;
  disabled?: boolean;
  onImported: () => void;
}

export function CardCsvTransfer({
  filters,
  disabled,
  onImported,
}: CardCsvTransferProps) {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<CardCsvImportMode>("upsert");
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState<"export-filtered" | "export-all" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<string[]>([]);

  async function handleExport(scope: "filtered" | "all") {
    setError(null);
    setSuccess(null);
    setRowErrors([]);
    setLoading(scope === "all" ? "export-all" : "export-filtered");
    try {
      await downloadCardsCsv(filters, scope);
      setSuccess(
        scope === "all"
          ? t("admin.csv.exportAllDone")
          : t("admin.csv.exportFilteredDone")
      );
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : t("admin.csv.exportFailed")
      );
    } finally {
      setLoading(null);
    }
  }

  async function runImport(csv: string) {
    if (!csv.trim()) {
      setError(t("admin.csv.empty"));
      setSuccess(null);
      setRowErrors([]);
      return;
    }

    setError(null);
    setSuccess(null);
    setRowErrors([]);
    setLoading("import");
    try {
      const result = await importCardsCsvFile(csv, mode);
      if (result.errors.length > 0) {
        setRowErrors(
          result.errors.map((entry) =>
            t("admin.csv.rowError", {
              row: entry.row,
              message: entry.message,
            })
          )
        );
      }

      if (result.created > 0 || result.updated > 0) {
        setSuccess(
          t("admin.csv.importSummary", {
            created: result.created,
            updated: result.updated,
          })
        );
        setCsvText("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        onImported();
      } else if (result.errors.length > 0) {
        setError(t("admin.csv.importFailed"));
      } else {
        setError(t("admin.csv.noRows"));
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : t("admin.csv.importFailed")
      );
    } finally {
      setLoading(null);
    }
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    await runImport(text);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{t("admin.csv.exportTitle")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("admin.csv.exportDescription")}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={disabled || loading !== null}
            onClick={() => void handleExport("filtered")}
          >
            <Download className="mr-1 h-4 w-4" />
            {loading === "export-filtered"
              ? t("admin.csv.exportPending")
              : t("admin.csv.exportFiltered")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={disabled || loading !== null}
            onClick={() => void handleExport("all")}
          >
            <Download className="mr-1 h-4 w-4" />
            {loading === "export-all"
              ? t("admin.csv.exportPending")
              : t("admin.csv.exportAll")}
          </Button>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{t("admin.csv.importTitle")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("admin.csv.importDescription")}
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="csv-import-mode">{t("admin.csv.importMode")}</Label>
            <select
              id="csv-import-mode"
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as CardCsvImportMode)
              }
              disabled={disabled || loading !== null}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
            >
              <option value="upsert">{t("admin.csv.modeUpsert")}</option>
              <option value="create">{t("admin.csv.modeCreate")}</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {mode === "upsert"
                ? t("admin.csv.modeUpsertHelp")
                : t("admin.csv.modeCreateHelp")}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={disabled || loading !== null}
              onChange={(event) =>
                void handleFileChange(event.target.files?.[0] ?? null)
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={disabled || loading !== null}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1 h-4 w-4" />
              {loading === "import"
                ? t("admin.csv.importPending")
                : t("admin.csv.importFile")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              disabled={disabled || loading !== null || !csvText.trim()}
              onClick={() => void runImport(csvText)}
            >
              {loading === "import"
                ? t("admin.csv.importPending")
                : t("admin.csv.importPaste")}
            </Button>
          </div>

          <Textarea
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            placeholder={t("admin.csv.placeholder")}
            disabled={disabled || loading !== null}
            className="min-h-28 font-mono text-xs"
          />

          <p className="text-xs text-muted-foreground">
            {t("admin.csv.formatHint")}
          </p>

          <details className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">
              {t("admin.csv.formatDetailsTitle")}
            </summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
              {t("admin.csv.formatDetailsBody")}
            </pre>
          </details>
        </div>

        <AdminFeedback
          success={success}
          error={error}
          onSuccessDismiss={() => setSuccess(null)}
        />

        {rowErrors.length > 0 ? (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {rowErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
