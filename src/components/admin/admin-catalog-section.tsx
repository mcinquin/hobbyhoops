"use client";

import { useId, useMemo, useState } from "react";
import { References } from "@/lib/types";
import {
  parseBrandSetRows,
  parseSetVariationRows,
  parseSingleColumnValues,
} from "@/lib/csv-parse";
import { patchReferences } from "@/lib/references-client";
import { BatchTextImport } from "@/components/admin/batch-text-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "@/i18n/client";

interface AdminCatalogSectionProps {
  references: References;
  onReferencesChange: (references: References) => void;
}

interface CatalogComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions: string[];
  disabled?: boolean;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function setsLinkedToBrand(references: References, brand: string): string[] {
  const query = brand.trim().toLowerCase();
  if (!query) return references.sets;

  const exactBrand = references.brands.find(
    (item) => item.toLowerCase() === query
  );
  if (exactBrand) {
    return references.brandSets[exactBrand] ?? [];
  }

  return uniqueSorted(
    references.brands
      .filter((item) => item.toLowerCase().includes(query))
      .flatMap((item) => references.brandSets[item] ?? [])
  );
}

function variationsLinkedToSet(references: References, setName: string): string[] {
  const query = setName.trim().toLowerCase();
  if (!query) return references.variations;

  const exactSet = references.sets.find((item) => item.toLowerCase() === query);
  if (exactSet) {
    return references.setVariations[exactSet] ?? [];
  }

  return uniqueSorted(
    references.sets
      .filter((item) => item.toLowerCase().includes(query))
      .flatMap((item) => references.setVariations[item] ?? [])
  );
}

function CatalogCombobox({
  value,
  onChange,
  placeholder,
  suggestions,
  disabled,
}: CatalogComboboxProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const query = value.trim().toLowerCase();
  const visibleSuggestions = useMemo(
    () =>
      suggestions
        .filter((suggestion) => suggestion.toLowerCase().includes(query))
        .slice(0, 8),
    [query, suggestions]
  );

  function selectSuggestion(nextValue: string): void {
    onChange(nextValue);
    setOpen(false);
    setActiveIndex(0);
  }

  return (
    <div className="relative">
      <Input
        id={inputId}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
            setOpen(true);
            return;
          }
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (visibleSuggestions.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % visibleSuggestions.length);
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(
              (index) =>
                (index - 1 + visibleSuggestions.length) %
                visibleSuggestions.length
            );
          }
          if (event.key === "Enter" && open) {
            event.preventDefault();
            selectSuggestion(visibleSuggestions[activeIndex]);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-expanded={open && visibleSuggestions.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
      />
      {open && visibleSuggestions.length > 0 && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 text-xs shadow-lg"
        >
          {visibleSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className="block w-full rounded px-2 py-1.5 text-left hover:bg-accent aria-selected:bg-accent"
              onMouseDown={(event) => {
                event.preventDefault();
                selectSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminCatalogSection({
  references,
  onReferencesChange,
}: AdminCatalogSectionProps) {
  const t = useTranslations();
  const [brand, setBrand] = useState("");
  const [brandForSet, setBrandForSet] = useState("");
  const [setName, setSetName] = useState("");
  const [brandForVariation, setBrandForVariation] = useState("");
  const [setForVariation, setSetForVariation] = useState("");
  const [variation, setVariation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setsForBrand = useMemo(
    () => setsLinkedToBrand(references, brandForSet),
    [references, brandForSet]
  );

  const setsForVariationBrand = useMemo(
    () => setsLinkedToBrand(references, brandForVariation),
    [references, brandForVariation]
  );

  const variationsForSet = useMemo(
    () => variationsLinkedToSet(references, setForVariation),
    [references, setForVariation]
  );

  async function run(action: () => Promise<References>) {
    setError(null);
    setLoading(true);
    try {
      onReferencesChange(await action());
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
      <p className="text-sm text-muted-foreground">{t("admin.catalog.intro")}</p>

      <Tabs defaultValue="brands">
        <TabsList>
          <TabsTrigger value="brands">{t("admin.catalog.brands")}</TabsTrigger>
          <TabsTrigger value="sets">{t("admin.catalog.sets")}</TabsTrigger>
          <TabsTrigger value="variations">{t("admin.catalog.variations")}</TabsTrigger>
        </TabsList>

        <TabsContent value="brands" className="space-y-4 pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-border p-4">
              <Label htmlFor="admin-brand-name">{t("admin.players.unitAdd")}</Label>
              <div className="flex gap-2">
                <Input
                  id="admin-brand-name"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder={t("admin.catalog.brandPlaceholder")}
                  disabled={loading}
                />
                <Button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    void run(async () => {
                      const refs = await patchReferences({
                        action: "addBrand",
                        brand,
                      });
                      setBrand("");
                      return refs;
                    })
                  }
                >
                  {t("common.add")}
                </Button>
              </div>
            </div>

            <BatchTextImport
              label={t("admin.players.batchImport")}
              description={t("admin.catalog.batchBrandsDescSpreadsheet")}
              placeholder={t("admin.catalog.batchBrandsPlaceholder")}
              disabled={loading}
              onSubmit={async (text) => {
                const brands = parseSingleColumnValues(text);
                onReferencesChange(
                  await patchReferences({ action: "addBrands", brands })
                );
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="sets" className="space-y-4 pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-border p-4">
              <Label>{t("admin.players.unitAdd")}</Label>
              <div className="space-y-2">
                <CatalogCombobox
                  value={brandForSet}
                  onChange={setBrandForSet}
                  placeholder={t("admin.catalog.setBrandPlaceholder")}
                  suggestions={references.brands}
                  disabled={loading}
                />
                <CatalogCombobox
                  value={setName}
                  onChange={setSetName}
                  placeholder={t("admin.catalog.setNamePlaceholder")}
                  suggestions={setsForBrand}
                  disabled={loading}
                />
                <Button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    void run(async () => {
                      const refs = await patchReferences({
                        action: "addSet",
                        brand: brandForSet,
                        set: setName,
                      });
                      setSetName("");
                      return refs;
                    })
                  }
                >
                  {t("common.add")}
                </Button>
              </div>
            </div>

            <BatchTextImport
              label={t("admin.players.batchImport")}
              description={t("admin.catalog.batchSetsDescSpreadsheet")}
              placeholder={t("admin.catalog.batchSetsPlaceholder")}
              disabled={loading}
              onSubmit={async (text) => {
                const entries = parseBrandSetRows(text);
                onReferencesChange(
                  await patchReferences({ action: "addSets", entries })
                );
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="variations" className="space-y-4 pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-border p-4">
              <Label>{t("admin.players.unitAdd")}</Label>
              <div className="space-y-2">
                <CatalogCombobox
                  value={brandForVariation}
                  onChange={setBrandForVariation}
                  placeholder={t("admin.catalog.variationBrandPlaceholder")}
                  suggestions={references.brands}
                  disabled={loading}
                />
                <CatalogCombobox
                  value={setForVariation}
                  onChange={setSetForVariation}
                  placeholder={t("admin.catalog.variationSetPlaceholder")}
                  suggestions={setsForVariationBrand}
                  disabled={loading}
                />
                <CatalogCombobox
                  value={variation}
                  onChange={setVariation}
                  placeholder={t("admin.catalog.variationPlaceholder")}
                  suggestions={variationsForSet}
                  disabled={loading}
                />
                <Button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    void run(async () => {
                      const refs = await patchReferences({
                        action: "addVariation",
                        set: setForVariation,
                        variation,
                      });
                      setVariation("");
                      return refs;
                    })
                  }
                >
                  {t("common.add")}
                </Button>
              </div>
            </div>

            <BatchTextImport
              label={t("admin.players.batchImport")}
              description={t("admin.catalog.batchVariationsDescSpreadsheet")}
              placeholder={t("admin.catalog.batchVariationsPlaceholder")}
              disabled={loading}
              onSubmit={async (text) => {
                const entries = parseSetVariationRows(text);
                onReferencesChange(
                  await patchReferences({ action: "addVariations", entries })
                );
              }}
            />
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
