"use client";

import type { References } from "@/lib/types";
import { useTranslations } from "@/i18n/client";
import { FieldLabel } from "./field-label";
import { FormCombobox } from "./form-combobox";
import type { CardFormState } from "./use-card-form-state";

interface CatalogSectionProps {
  formId: string;
  references: References;
  state: CardFormState;
}

function ScopeHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

/**
 * Catalog step block: brand, set and variation. Each field lists the existing values and
 * accepts a new one; new values join the references when the card is saved.
 */
export function CatalogSection({ formId, references, state }: CatalogSectionProps) {
  const t = useTranslations();
  const { form, update, updateBrand, updateSet, brandKey, setKey } = state;
  const { setsForBrand, variationsForSet, isPrefilled } = state;
  const createOptionLabel = (value: string) => t("cards.createOption", { value });

  return (
    <>
      <div className="space-y-2 col-span-2">
        <FieldLabel htmlFor={`${formId}-brand`} isPrefilled={isPrefilled("brand")}>
          {t("cards.brand")}
        </FieldLabel>
        <FormCombobox
          id={`${formId}-brand`}
          value={form.brand || ""}
          onChange={updateBrand}
          suggestions={references.brands}
          createOptionLabel={createOptionLabel}
        />
      </div>

      <div className="space-y-2 col-span-2">
        <FieldLabel htmlFor={`${formId}-set`} isPrefilled={isPrefilled("set")}>
          {t("cards.set")}
        </FieldLabel>
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
          createOptionLabel={createOptionLabel}
        />
      </div>

      <div className="space-y-2 col-span-2">
        <FieldLabel htmlFor={`${formId}-variation`} isPrefilled={isPrefilled("variation")}>
          {t("cards.variation")}
        </FieldLabel>
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
          createOptionLabel={createOptionLabel}
        />
      </div>
    </>
  );
}
