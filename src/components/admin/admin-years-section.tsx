"use client";

import { useMemo, useState } from "react";
import { References } from "@/lib/types";
import { parseSingleColumnValues } from "@/lib/csv-parse";
import { normYear } from "@/lib/reference-mutations";
import { patchReferences } from "@/lib/references-client";
import { BatchTextImport } from "@/components/admin/batch-text-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface AdminYearsSectionProps {
  references: References;
  onReferencesChange: (references: References) => void;
}

export function AdminYearsSection({
  references,
  onReferencesChange,
}: AdminYearsSectionProps) {
  const t = useTranslations();
  const [year, setYear] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return references.years;
    const q = search.toLowerCase();
    return references.years.filter((name) => name.toLowerCase().includes(q));
  }, [references.years, search]);

  async function handleAddYear() {
    const value = year.trim();
    if (!value) {
      setError(t("admin.years.valueRequired"));
      return;
    }
    if (!normYear(value)) {
      setError(t("admin.years.invalidFormat"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      onReferencesChange(await patchReferences({ action: "addYear", year: value }));
      setYear("");
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : t("errors.updateFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("admin.years.intro")}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <Label htmlFor="admin-year-value">{t("admin.players.unitAdd")}</Label>
          <div className="flex gap-2">
            <Input
              id="admin-year-value"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder={t("admin.years.placeholder")}
              disabled={loading}
            />
            <Button type="button" disabled={loading} onClick={() => void handleAddYear()}>
              {t("common.add")}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <BatchTextImport
          label={t("admin.players.batchImport")}
          description={t("admin.years.batchDescSpreadsheet")}
          placeholder={t("admin.years.batchPlaceholder")}
          disabled={loading}
          onSubmit={async (text) => {
            const years = parseSingleColumnValues(text);
            onReferencesChange(
              await patchReferences({ action: "addYears", years })
            );
          }}
        />
      </div>

      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.years.filter")}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {t("admin.years.referenced", { count: references.years.length })}
          {search ? ` ${t("admin.years.shown", { count: filtered.length })}` : ""}
        </p>
        <div className="max-h-72 overflow-auto rounded-lg border border-border p-3 text-sm">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground">{t("admin.years.noneFound")}</p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
