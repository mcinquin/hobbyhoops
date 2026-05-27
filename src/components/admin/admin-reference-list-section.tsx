"use client";

import { useMemo, useState, type ReactNode } from "react";
import { References } from "@/lib/types";
import { parseSingleColumnValues } from "@/lib/csv-parse";
import { patchReferences } from "@/lib/references-client";
import { BatchTextImport } from "@/components/admin/batch-text-import";
import { AdminDeletableList } from "@/components/admin/admin-deletable-list";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { FilterableListBrowser } from "@/components/filterable-list-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface AdminReferenceListSectionProps {
  onReferencesChange: (references: References) => void;
  introKey: string;
  unitInputId: string;
  unitPlaceholderKey: string;
  filterPlaceholderKey: string;
  referencedKey: string;
  shownKey: string;
  emptyKey: string;
  batchDescKey: string;
  batchPlaceholderKey: string;
  unitRequiredKey: string;
  addedKey: string;
  deletedKey?: string;
  items: string[];
  deletable?: boolean;
  validateUnit?: (value: string) => string | null;
  buildAddPatch: (value: string) => Record<string, unknown>;
  buildBatchPatch: (values: string[]) => Record<string, unknown>;
  buildRemovePatch?: (value: string) => Record<string, unknown>;
  /** Liste avec `FilterableListBrowser` (ex. joueurs). */
  listLayout?: "default" | "filterable";
  filterableListClassName?: string;
}

export function AdminReferenceListSection({
  onReferencesChange,
  introKey,
  unitInputId,
  unitPlaceholderKey,
  filterPlaceholderKey,
  referencedKey,
  shownKey,
  emptyKey,
  batchDescKey,
  batchPlaceholderKey,
  unitRequiredKey,
  addedKey,
  deletedKey,
  items,
  deletable = false,
  validateUnit,
  buildAddPatch,
  buildBatchPatch,
  buildRemovePatch,
  listLayout = "default",
  filterableListClassName = "max-w-none border-0 p-0",
}: AdminReferenceListSectionProps) {
  const t = useTranslations();
  const [unitValue, setUnitValue] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((name) => name.toLowerCase().includes(q));
  }, [items, search]);

  async function handleAddUnit() {
    const value = unitValue.trim();
    if (!value) {
      setError(t(unitRequiredKey));
      setSuccess(null);
      return;
    }
    if (validateUnit) {
      const validationError = validateUnit(value);
      if (validationError) {
        setError(t(validationError));
        setSuccess(null);
        return;
      }
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      onReferencesChange(
        await patchReferences(buildAddPatch(value))
      );
      setUnitValue("");
      setSuccess(t(addedKey));
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : t("errors.updateFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  function renderItemsList(itemsToShow: string[]): ReactNode {
    if (itemsToShow.length === 0) {
      return <p className="text-muted-foreground">{t(emptyKey)}</p>;
    }
    if (deletable && buildRemovePatch) {
      return (
        <AdminDeletableList
          items={itemsToShow}
          getKey={(name) => name}
          renderLabel={(name) => name}
          emptyLabel={t(emptyKey)}
          disabled={loading}
          onDelete={async (name) => {
            onReferencesChange(await patchReferences(buildRemovePatch(name)));
            if (deletedKey) setSuccess(t(deletedKey));
          }}
        />
      );
    }
    return (
      <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {itemsToShow.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t(introKey)}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <Label htmlFor={unitInputId}>{t("admin.players.unitAdd")}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={unitInputId}
              value={unitValue}
              onChange={(e) => setUnitValue(e.target.value)}
              placeholder={t(unitPlaceholderKey)}
              disabled={loading}
            />
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={loading}
              onClick={() => void handleAddUnit()}
            >
              {t("common.add")}
            </Button>
          </div>
          <AdminFeedback
            success={success}
            error={error}
            onSuccessDismiss={() => setSuccess(null)}
          />
        </div>

        <BatchTextImport
          label={t("admin.players.batchImport")}
          description={t(batchDescKey)}
          placeholder={t(batchPlaceholderKey)}
          disabled={loading}
          onSubmit={async (text) => {
            const values = parseSingleColumnValues(text);
            onReferencesChange(
              await patchReferences(buildBatchPatch(values))
            );
          }}
        />
      </div>

      {listLayout === "filterable" ? (
        <FilterableListBrowser
          items={items}
          filterPlaceholder={t(filterPlaceholderKey)}
          countLabel={t(referencedKey, { count: items.length })}
          filteredCountLabel={(count) => t(shownKey, { count })}
          emptyLabel={t(emptyKey)}
          className={filterableListClassName}
          renderList={renderItemsList}
        />
      ) : (
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(filterPlaceholderKey)}
              className="pl-9"
              aria-label={t(filterPlaceholderKey)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {t(referencedKey, { count: items.length })}
            {search ? ` ${t(shownKey, { count: filtered.length })}` : ""}
          </p>
          <div className="max-h-72 overflow-auto rounded-lg border border-border p-3 text-sm">
            {renderItemsList(filtered)}
          </div>
        </div>
      )}
    </div>
  );
}
