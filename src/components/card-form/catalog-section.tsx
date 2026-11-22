"use client";

import { useState } from "react";
import type { References } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { patchReferences } from "@/lib/references-client";
import { useTranslations } from "@/i18n/client";
import { FormCombobox } from "./form-combobox";
import { InlineReferenceAdd } from "./inline-reference-add";
import type { CardFormState } from "./use-card-form-state";

interface CatalogSectionProps {
  formId: string;
  references: References;
  state: CardFormState;
  /** When set, shows the inline "add brand / add set" rows and refreshes references after each add. */
  onReferencesUpdated?: () => Promise<void>;
}

function ScopeHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

/** Card form block: brand, set and variation, with inline brand / set creation. */
export function CatalogSection({
  formId,
  references,
  state,
  onReferencesUpdated,
}: CatalogSectionProps) {
  const t = useTranslations();
  const { form, update, updateBrand, updateSet, brandKey, setKey, feedback } = state;
  const { setsForBrand, variationsForSet } = state;
  const [newBrand, setNewBrand] = useState("");
  const [newSet, setNewSet] = useState("");
  const [addingBrand, setAddingBrand] = useState(false);
  const [addingSet, setAddingSet] = useState(false);

  function reportError(err: unknown) {
    feedback.setError(
      err instanceof Error && err.message ? err.message : t("errors.updateFailed")
    );
  }

  function rejectInput(message: string) {
    feedback.setError(message);
    feedback.setSuccess(null);
  }

  async function handleAddBrand() {
    if (!onReferencesUpdated) return;
    const name = newBrand.trim();
    if (!name) {
      rejectInput(t("cards.brandNameRequired"));
      return;
    }
    feedback.reset();
    setAddingBrand(true);
    try {
      await patchReferences({ action: "addBrand", brand: name });
      await onReferencesUpdated();
      setNewBrand("");
      update("brand", name);
      feedback.setSuccess(t("cards.brandAdded"));
    } catch (err) {
      reportError(err);
    } finally {
      setAddingBrand(false);
    }
  }

  async function handleAddSet() {
    if (!onReferencesUpdated) return;
    const setName = newSet.trim();
    if (!brandKey) {
      rejectInput(t("cards.brandBeforeSet"));
      return;
    }
    if (!setName) {
      rejectInput(t("cards.setNameRequired"));
      return;
    }
    feedback.reset();
    setAddingSet(true);
    try {
      await patchReferences({ action: "addSet", brand: brandKey, set: setName });
      await onReferencesUpdated();
      setNewSet("");
      update("set", setName);
      feedback.setSuccess(t("cards.setAdded"));
    } catch (err) {
      reportError(err);
    } finally {
      setAddingSet(false);
    }
  }

  return (
    <>
      <div className="space-y-2 col-span-2">
        <Label htmlFor={`${formId}-brand`}>{t("cards.brand")}</Label>
        <FormCombobox
          id={`${formId}-brand`}
          value={form.brand || ""}
          onChange={updateBrand}
          suggestions={references.brands}
        />
        {onReferencesUpdated && (
          <InlineReferenceAdd
            label={t("cards.newBrand")}
            buttonLabel={t("cards.addBrand")}
            placeholder={t("cards.placeholderBrand")}
            value={newBrand}
            onChange={setNewBrand}
            onAdd={() => void handleAddBrand()}
            isBusy={addingBrand}
          />
        )}
      </div>

      <div className="space-y-2 col-span-2">
        <Label htmlFor={`${formId}-set`}>{t("cards.set")}</Label>
        <ScopeHint>
          {!brandKey
            ? t("cards.chooseBrandForSets")
            : setsForBrand.length > 0
              ? t("cards.setsForBrandListed", {
                  brand: brandKey,
                  count: setsForBrand.length,
                })
              : t("cards.setsForBrandNone", { brand: brandKey })}
        </ScopeHint>
        <FormCombobox
          id={`${formId}-set`}
          value={form.set || ""}
          onChange={updateSet}
          suggestions={setsForBrand}
        />
        {onReferencesUpdated && (
          <InlineReferenceAdd
            label={t("cards.newSet")}
            buttonLabel={t("cards.addSet")}
            placeholder={
              brandKey
                ? t("cards.placeholderSetUnderBrand", { brand: brandKey })
                : t("cards.chooseBrandFirst")
            }
            value={newSet}
            onChange={setNewSet}
            onAdd={() => void handleAddSet()}
            isBusy={addingSet}
            disabled={!brandKey}
          />
        )}
      </div>

      <div className="space-y-2 col-span-2">
        <Label htmlFor={`${formId}-variation`}>{t("cards.variation")}</Label>
        <ScopeHint>
          {!setKey
            ? t("cards.chooseSetForVariations")
            : variationsForSet.length > 0
              ? t("cards.variationsForSetListed", {
                  set: setKey,
                  count: variationsForSet.length,
                })
              : t("cards.variationsForSetNone", { set: setKey })}
        </ScopeHint>
        <FormCombobox
          id={`${formId}-variation`}
          value={form.variation || ""}
          onChange={(value) => update("variation", value)}
          suggestions={variationsForSet}
        />
      </div>
    </>
  );
}
