"use client";

import { useMemo, useState } from "react";
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
import { AdminDeletableList } from "@/components/admin/admin-deletable-list";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { AutocompleteCombobox } from "@/components/autocomplete-combobox";
import { FilterableListBrowser } from "@/components/filterable-list-browser";
import {
  setsLinkedToBrand,
  variationsLinkedToSet,
} from "@/lib/reference-suggestions";
import { useTranslations } from "@/i18n/client";

interface AdminCatalogSectionProps {
  references: References;
  onReferencesChange: (references: References) => void;
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
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("brands");

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

  const brandSetEntries = useMemo(() => {
    const entries: { key: string; brand: string; set: string }[] = [];
    for (const brandName of references.brands) {
      for (const setLabel of references.brandSets[brandName] ?? []) {
        entries.push({
          key: `${brandName}\u0000${setLabel}`,
          brand: brandName,
          set: setLabel,
        });
      }
    }
    return entries.sort((a, b) =>
      a.brand.localeCompare(b.brand) || a.set.localeCompare(b.set)
    );
  }, [references]);

  const setVariationEntries = useMemo(() => {
    const entries: { key: string; set: string; variation: string }[] = [];
    for (const setName of references.sets) {
      for (const variationName of references.setVariations[setName] ?? []) {
        entries.push({
          key: `${setName}\u0000${variationName}`,
          set: setName,
          variation: variationName,
        });
      }
    }
    return entries.sort((a, b) =>
      a.set.localeCompare(b.set) || a.variation.localeCompare(b.variation)
    );
  }, [references]);

  async function run(action: () => Promise<References>, successMessage: string) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      onReferencesChange(await action());
      setSuccess(successMessage);
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <select
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm md:hidden"
        >
          <option value="brands">{t("admin.catalog.brands")}</option>
          <option value="sets">{t("admin.catalog.sets")}</option>
          <option value="variations">{t("admin.catalog.variations")}</option>
        </select>

        <TabsList className="hidden !h-auto w-full max-w-full justify-start p-1 md:inline-flex">
          <TabsTrigger value="brands" className="h-8 flex-none px-3">
            {t("admin.catalog.brands")}
          </TabsTrigger>
          <TabsTrigger value="sets" className="h-8 flex-none px-3">
            {t("admin.catalog.sets")}
          </TabsTrigger>
          <TabsTrigger value="variations" className="h-8 flex-none px-3">
            {t("admin.catalog.variations")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brands" className="space-y-4 pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-border p-4">
              <Label htmlFor="admin-brand-name">{t("admin.players.unitAdd")}</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="admin-brand-name"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder={t("admin.catalog.brandPlaceholder")}
                  disabled={loading}
                />
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={loading}
                  onClick={() =>
                    void run(async () => {
                      const refs = await patchReferences({
                        action: "addBrand",
                        brand,
                      });
                      setBrand("");
                      return refs;
                    }, t("admin.catalog.brandAdded"))
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

          <FilterableListBrowser
            items={references.brands}
            filterPlaceholder={t("admin.catalog.filterBrands")}
            countLabel={t("admin.catalog.brandsCount", {
              count: references.brands.length,
            })}
            emptyLabel={t("admin.catalog.noBrands")}
            className="max-w-none"
            renderList={(filtered) => (
              <AdminDeletableList
                items={filtered}
                getKey={(name) => name}
                renderLabel={(name) => name}
                emptyLabel={t("admin.catalog.noBrands")}
                disabled={loading}
                onDelete={async (name) => {
                  await run(
                    () =>
                      patchReferences({ action: "removeBrand", brand: name }),
                    t("admin.catalog.brandDeleted")
                  );
                }}
              />
            )}
          />
        </TabsContent>

        <TabsContent value="sets" className="space-y-4 pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-border p-4">
              <Label>{t("admin.players.unitAdd")}</Label>
              <div className="space-y-2">
                <AutocompleteCombobox
                  value={brandForSet}
                  onChange={setBrandForSet}
                  placeholder={t("admin.catalog.setBrandPlaceholder")}
                  suggestions={references.brands}
                  disabled={loading}
                />
                <AutocompleteCombobox
                  value={setName}
                  onChange={setSetName}
                  placeholder={t("admin.catalog.setNamePlaceholder")}
                  suggestions={setsForBrand}
                  disabled={loading}
                />
                <Button
                  type="button"
                  className="w-full sm:w-auto"
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
                    }, t("admin.catalog.setAdded"))
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

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("admin.catalog.setsCount", { count: brandSetEntries.length })}
            </p>
            <div className="max-h-56 overflow-auto rounded-lg border border-border p-3 text-sm">
              <AdminDeletableList
                items={brandSetEntries}
                getKey={(entry) => entry.key}
                renderLabel={(entry) => `${entry.brand} · ${entry.set}`}
                emptyLabel={t("admin.catalog.noSets")}
                disabled={loading}
                onDelete={async (entry) => {
                  await run(
                    () =>
                      patchReferences({
                        action: "removeSet",
                        brand: entry.brand,
                        set: entry.set,
                      }),
                    t("admin.catalog.setDeleted")
                  );
                }}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="variations" className="space-y-4 pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-border p-4">
              <Label>{t("admin.players.unitAdd")}</Label>
              <div className="space-y-2">
                <AutocompleteCombobox
                  value={brandForVariation}
                  onChange={setBrandForVariation}
                  placeholder={t("admin.catalog.variationBrandPlaceholder")}
                  suggestions={references.brands}
                  disabled={loading}
                />
                <AutocompleteCombobox
                  value={setForVariation}
                  onChange={setSetForVariation}
                  placeholder={t("admin.catalog.variationSetPlaceholder")}
                  suggestions={setsForVariationBrand}
                  disabled={loading}
                />
                <AutocompleteCombobox
                  value={variation}
                  onChange={setVariation}
                  placeholder={t("admin.catalog.variationPlaceholder")}
                  suggestions={variationsForSet}
                  disabled={loading}
                />
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={loading}
                  onClick={() =>
                    void run(async () => {
                      if (brandForVariation.trim() && setForVariation.trim()) {
                        await patchReferences({
                          action: "addSet",
                          brand: brandForVariation,
                          set: setForVariation,
                        });
                      }
                      const refs = await patchReferences({
                        action: "addVariation",
                        set: setForVariation,
                        variation,
                      });
                      setVariation("");
                      return refs;
                    }, t("admin.catalog.variationAdded"))
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

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("admin.catalog.variationsCount", {
                count: setVariationEntries.length,
              })}
            </p>
            <div className="max-h-56 overflow-auto rounded-lg border border-border p-3 text-sm">
              <AdminDeletableList
                items={setVariationEntries}
                getKey={(entry) => entry.key}
                renderLabel={(entry) => `${entry.set} · ${entry.variation}`}
                emptyLabel={t("admin.catalog.noVariations")}
                disabled={loading}
                onDelete={async (entry) => {
                  await run(
                    () =>
                      patchReferences({
                        action: "removeVariation",
                        set: entry.set,
                        variation: entry.variation,
                      }),
                    t("admin.catalog.variationDeleted")
                  );
                }}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AdminFeedback
        success={success}
        error={error}
        onSuccessDismiss={() => setSuccess(null)}
      />
    </div>
  );
}
