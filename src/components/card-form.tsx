"use client";

import { useState, useMemo, useId, type ComponentProps } from "react";
import { Card, References } from "@/lib/types";
import {
  buildCardWritePayload,
  splitGrading,
  validateCardWritePayload,
} from "@/lib/card-write";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AutocompleteCombobox } from "@/components/autocomplete-combobox";
import { OpeningDateInput } from "@/components/opening-date-input";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { useTranslations } from "@/i18n/client";
import {
  setsLinkedToBrand,
  variationsLinkedToSet,
} from "@/lib/reference-suggestions";
import { patchReferences } from "@/lib/references-client";

interface CardFormProps {
  card?: Partial<Card> | null;
  references: References;
  open: boolean;
  onClose: () => void;
  onSave: (card: Partial<Card>) => boolean | Promise<boolean>;
  /** Affiche l’ajout de marques/sets dans le formulaire (désactivé dans l’admin cartes). */
  manageReferences?: boolean;
  /** Après ajout marque/set via l’API, recharger les références (ex. refetch GET /api/references). */
  onReferencesUpdated?: () => Promise<void>;
  saveError?: string | null;
  dialogTitle?: string;
  submitLabel?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void | Promise<void>;
    disabled?: boolean;
  };
}

function FormCombobox(props: ComponentProps<typeof AutocompleteCombobox>) {
  return (
    <AutocompleteCombobox
      suggestionsOnlyWhenOpen
      className="w-full"
      listClassName="z-50 max-h-64 min-w-full text-sm"
      {...props}
    />
  );
}

const emptyCard: Partial<Card> = {
  player: "",
  team: "",
  year: null,
  brand: "",
  set: "",
  variation: "",
  autograph: false,
  memorabilia: false,
  serialNumber: null,
  serialCurrent: null,
  serialTotal: null,
  cardNumber: "",
  grading: "Ungraded",
  openingDate: null,
  protection: "",
  storage: "",
  photo: null,
  tradable: false,
  rookie: false,
  notes: "",
};

export function CardForm({
  card,
  references,
  open,
  onClose,
  onSave,
  manageReferences = true,
  onReferencesUpdated,
  saveError = null,
  dialogTitle,
  submitLabel,
  secondaryAction,
}: CardFormProps) {
  const formId = useId();

  const formSeed = open ? (card?.id ?? "create") : "closed";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {open ? (
          <CardFormFields
            key={formSeed}
            card={card}
            references={references}
            onClose={onClose}
            onSave={onSave}
            manageReferences={manageReferences}
            onReferencesUpdated={onReferencesUpdated}
            saveError={saveError}
            dialogTitle={dialogTitle}
            submitLabel={submitLabel}
            secondaryAction={secondaryAction}
            formId={formId}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type CardFormFieldsProps = {
  card?: Partial<Card> | null;
  references: References;
  onClose: () => void;
  onSave: (card: Partial<Card>) => boolean | Promise<boolean>;
  manageReferences: boolean;
  onReferencesUpdated?: () => Promise<void>;
  saveError?: string | null;
  dialogTitle?: string;
  submitLabel?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void | Promise<void>;
    disabled?: boolean;
  };
  formId: string;
};

function CardFormFields({
  card,
  references,
  onClose,
  onSave,
  manageReferences,
  onReferencesUpdated,
  saveError = null,
  dialogTitle,
  submitLabel,
  secondaryAction,
  formId,
}: CardFormFieldsProps) {
  const t = useTranslations();
  const [form, setForm] = useState<Partial<Card>>(() => {
    if (!card) {
      return { ...emptyCard };
    }
    const { company } = splitGrading(card.grading);
    return { ...card, grading: company };
  });
  const [gradingNote, setGradingNote] = useState(
    () => splitGrading(card?.grading).note
  );
  const [newBrand, setNewBrand] = useState("");
  const [newSet, setNewSet] = useState("");
  const [refError, setRefError] = useState<string | null>(null);
  const [refSuccess, setRefSuccess] = useState<string | null>(null);
  const [addingBrand, setAddingBrand] = useState(false);
  const [addingSet, setAddingSet] = useState(false);
  const [saving, setSaving] = useState(false);

  const brandKey = (form.brand ?? "").trim();
  const setKey = (form.set ?? "").trim();
  const setsForBrand = useMemo(
    () => setsLinkedToBrand(references, brandKey),
    [brandKey, references]
  );

  const variationsForSet = useMemo(
    () => variationsLinkedToSet(references, setKey),
    [references, setKey]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const payload = buildCardWritePayload(form, gradingNote);
    const validationError = validateCardWritePayload(payload);
    if (validationError) {
      setRefError(t(validationError));
      setRefSuccess(null);
      return;
    }
    setRefError(null);
    setRefSuccess(null);
    setSaving(true);
    try {
      const saved = await onSave(payload as Partial<Card>);
      if (!saved) {
        return;
      }
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof Card, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateBrand = (value: string) => {
    setForm((prev) => {
      const b = value.trim();
      const available = setsLinkedToBrand(references, b);
      let nextSet = prev.set ?? "";
      if (b && available.length > 0 && nextSet && !available.includes(nextSet)) {
        nextSet = "";
      }
      const nextVariation = nextSet === (prev.set ?? "") ? (prev.variation ?? "") : "";
      return { ...prev, brand: value, set: nextSet, variation: nextVariation };
    });
  };

  const updateSet = (value: string) => {
    setForm((prev) => {
      const s = value.trim();
      const available = variationsLinkedToSet(references, s);
      let nextVariation = prev.variation ?? "";
      if (s && available.length > 0 && nextVariation && !available.includes(nextVariation)) {
        nextVariation = "";
      }
      return { ...prev, set: value, variation: nextVariation };
    });
  };

  async function handleAddBrand() {
    if (!onReferencesUpdated) return;
    const name = newBrand.trim();
    if (!name) {
      setRefError(t("cards.brandNameRequired"));
      setRefSuccess(null);
      return;
    }
    setRefError(null);
    setRefSuccess(null);
    setAddingBrand(true);
    try {
      await patchReferences({ action: "addBrand", brand: name });
      await onReferencesUpdated();
      setNewBrand("");
      update("brand", name);
      setRefSuccess(t("cards.brandAdded"));
    } catch (err) {
      setRefError(
        err instanceof Error && err.message ? err.message : t("errors.updateFailed")
      );
    } finally {
      setAddingBrand(false);
    }
  }

  async function handleAddSet() {
    if (!onReferencesUpdated) return;
    const brand = brandKey;
    const setName = newSet.trim();
    if (!brand) {
      setRefError(t("cards.brandBeforeSet"));
      setRefSuccess(null);
      return;
    }
    if (!setName) {
      setRefError(t("cards.setNameRequired"));
      setRefSuccess(null);
      return;
    }
    setRefError(null);
    setRefSuccess(null);
    setAddingSet(true);
    try {
      await patchReferences({ action: "addSet", brand, set: setName });
      await onReferencesUpdated();
      setNewSet("");
      update("set", setName);
      setRefSuccess(t("cards.setAdded"));
    } catch (err) {
      setRefError(
        err instanceof Error && err.message ? err.message : t("errors.updateFailed")
      );
    } finally {
      setAddingSet(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {dialogTitle ?? (card ? t("cards.editTitle") : t("cards.addTitle"))}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-player`}>{t("cards.player")}</Label>
              <FormCombobox
                id={`${formId}-player`}
                value={form.player || ""}
                onChange={(value) => update("player", value)}
                suggestions={references.players}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-team`}>{t("cards.club")}</Label>
              <FormCombobox
                id={`${formId}-team`}
                value={form.team || ""}
                onChange={(value) => update("team", value)}
                suggestions={references.teams}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-year`}>{t("cards.year")}</Label>
              <FormCombobox
                id={`${formId}-year`}
                value={form.year || ""}
                onChange={(value) => update("year", value)}
                suggestions={references.years}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>{t("cards.brand")}</Label>
              <FormCombobox
                value={form.brand || ""}
                onChange={updateBrand}
                suggestions={references.brands}
              />
              {manageReferences && onReferencesUpdated && (
                <div className="flex flex-wrap gap-2 items-end pt-1">
                  <div className="flex-1 min-w-[140px] space-y-1">
                    <span className="text-xs text-muted-foreground">{t("cards.newBrand")}</span>
                    <Input
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder={t("cards.placeholderBrand")}
                      disabled={addingBrand}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={addingBrand}
                    onClick={() => void handleAddBrand()}
                  >
                    {addingBrand ? "…" : t("cards.addBrand")}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label>{t("cards.set")}</Label>
              {brandKey ? (
                <p className="text-xs text-muted-foreground">
                  {setsForBrand.length > 0
                    ? t("cards.setsForBrandListed", {
                        brand: brandKey,
                        count: setsForBrand.length,
                      })
                    : t("cards.setsForBrandNone", { brand: brandKey })}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("cards.chooseBrandForSets")}
                </p>
              )}
              <FormCombobox
                value={form.set || ""}
                onChange={updateSet}
                suggestions={setsForBrand}
              />
              {manageReferences && onReferencesUpdated && (
                <div className="flex flex-wrap gap-2 items-end pt-1">
                  <div className="flex-1 min-w-[140px] space-y-1">
                    <span className="text-xs text-muted-foreground">{t("cards.newSet")}</span>
                    <Input
                      value={newSet}
                      onChange={(e) => setNewSet(e.target.value)}
                      placeholder={
                        brandKey
                          ? t("cards.placeholderSetUnderBrand", { brand: brandKey })
                          : t("cards.chooseBrandFirst")
                      }
                      disabled={addingSet || !brandKey}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={addingSet || !brandKey}
                    onClick={() => void handleAddSet()}
                  >
                    {addingSet ? "…" : t("cards.addSet")}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label>{t("cards.variation")}</Label>
              {setKey ? (
                <p className="text-xs text-muted-foreground">
                  {variationsForSet.length > 0
                    ? t("cards.variationsForSetListed", {
                        set: setKey,
                        count: variationsForSet.length,
                      })
                    : t("cards.variationsForSetNone", { set: setKey })}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("cards.chooseSetForVariations")}
                </p>
              )}
              <FormCombobox
                value={form.variation || ""}
                onChange={(value) => update("variation", value)}
                suggestions={variationsForSet}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("cards.cardNum")}</Label>
              <Input
                value={form.cardNumber || ""}
                onChange={(e) => update("cardNumber", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("cards.serialNum")}</Label>
              <Input
                value={form.serialNumber || ""}
                onChange={(e) =>
                  update("serialNumber", e.target.value || null)
                }
                placeholder={t("cards.placeholderSerial")}
              />
            </div>

            <OpeningDateInput
              id={`${formId}-opening-date`}
              label={t("cards.openingDate")}
              value={form.openingDate ?? null}
              onChange={(value) => update("openingDate", value)}
            />

            <div className="space-y-2">
              <Label>{t("cards.grading")}</Label>
              <select
                value={form.grading || "Ungraded"}
                onChange={(e) => {
                  const company = e.target.value;
                  update("grading", company);
                  if (company === "Ungraded") {
                    setGradingNote("");
                  }
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {references.gradings.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>{t("cards.gradeNote")}</Label>
              <Input
                value={gradingNote}
                onChange={(e) => setGradingNote(e.target.value)}
                placeholder={t("cards.placeholderGrade")}
                disabled={(form.grading || "Ungraded") === "Ungraded"}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("cards.protectionOptional")}</Label>
              <FormCombobox
                value={form.protection || ""}
                onChange={(value) => update("protection", value)}
                suggestions={references.protections}
                clearOptionLabel={t("cards.selectNone")}
                placeholder={t("cards.selectNone")}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>{t("cards.storageOptional")}</Label>
              <FormCombobox
                value={form.storage || ""}
                onChange={(value) => update("storage", value)}
                suggestions={references.storages}
                clearOptionLabel={t("cards.selectNone")}
                placeholder={t("cards.selectNone")}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>{t("cards.notesOptional")}</Label>
              <textarea
                value={form.notes || ""}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full min-h-[4.5rem] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                placeholder={t("cards.notesPlaceholder")}
              />
            </div>
          </div>

          <AdminFeedback
            success={refSuccess}
            error={saveError ?? refError}
            onSuccessDismiss={() => setRefSuccess(null)}
          />

          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.rookie || false}
                onCheckedChange={(v) => update("rookie", v)}
              />
              <Label>{t("badges.rookie")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.autograph || false}
                onCheckedChange={(v) => update("autograph", v)}
              />
              <Label>{t("cards.autograph")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.memorabilia || false}
                onCheckedChange={(v) => update("memorabilia", v)}
              />
              <Label>{t("cards.memorabiliaLabel")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.tradable || false}
                onCheckedChange={(v) => update("tradable", v)}
              />
              <Label>{t("cards.tradable")}</Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {secondaryAction ? (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto"
                disabled={saving || secondaryAction.disabled}
                onClick={() => void secondaryAction.onClick()}
              >
                {secondaryAction.label}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving || secondaryAction?.disabled}>
              {saving
                ? t("common.saving")
                : (submitLabel ??
                  (card?.id ? t("common.save") : t("cards.addCard")))}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}
