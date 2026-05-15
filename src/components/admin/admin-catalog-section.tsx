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
  const [setForVariation, setSetForVariation] = useState("");
  const [variation, setVariation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setsForBrand = useMemo(() => {
    const key = brandForSet.trim();
    if (!key) return [];
    return references.brandSets[key] ?? [];
  }, [references.brandSets, brandForSet]);

  const variationsForSet = useMemo(() => {
    const key = setForVariation.trim();
    if (!key) return [];
    return references.setVariations[key] ?? [];
  }, [references.setVariations, setForVariation]);

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
              <Label htmlFor="admin-set-brand">{t("admin.players.unitAdd")}</Label>
              <div className="space-y-2">
                <Input
                  id="admin-set-brand"
                  list="admin-brands-list"
                  value={brandForSet}
                  onChange={(e) => setBrandForSet(e.target.value)}
                  placeholder={t("admin.catalog.setBrandPlaceholder")}
                  disabled={loading}
                />
                <datalist id="admin-brands-list">
                  {references.brands.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <Input
                  list={setsForBrand.length > 0 ? "admin-sets-list" : undefined}
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  placeholder={t("admin.catalog.setNamePlaceholder")}
                  disabled={loading}
                />
                {setsForBrand.length > 0 && (
                  <datalist id="admin-sets-list">
                    {setsForBrand.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                )}
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
              <Label htmlFor="admin-variation-set">{t("admin.players.unitAdd")}</Label>
              <div className="space-y-2">
                <Input
                  id="admin-variation-set"
                  list="admin-variation-sets-list"
                  value={setForVariation}
                  onChange={(e) => setSetForVariation(e.target.value)}
                  placeholder={t("admin.catalog.variationSetPlaceholder")}
                  disabled={loading}
                />
                <datalist id="admin-variation-sets-list">
                  {references.sets.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <Input
                  list={variationsForSet.length > 0 ? "admin-variations-list" : undefined}
                  value={variation}
                  onChange={(e) => setVariation(e.target.value)}
                  placeholder={t("admin.catalog.variationPlaceholder")}
                  disabled={loading}
                />
                {variationsForSet.length > 0 && (
                  <datalist id="admin-variations-list">
                    {variationsForSet.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                )}
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
