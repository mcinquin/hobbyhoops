"use client";

import { useState, useMemo, useId } from "react";
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
import { useTranslations } from "@/i18n/client";
import { patchReferences } from "@/lib/references-client";

interface CardFormProps {
  card?: Card | null;
  references: References;
  open: boolean;
  onClose: () => void;
  onSave: (card: Partial<Card>) => boolean | Promise<boolean>;
  /** Affiche l’ajout de marques/sets dans le formulaire (désactivé dans l’admin cartes). */
  manageReferences?: boolean;
  /** Après ajout marque/set via l’API, recharger les références (ex. refetch GET /api/references). */
  onReferencesUpdated?: () => Promise<void>;
  saveError?: string | null;
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
}: CardFormProps) {
  const formId = useId();
  const setsListId = `${formId}-sets`;
  const variationsListId = `${formId}-variations`;
  const playersListId = `${formId}-players`;
  const teamsListId = `${formId}-teams`;
  const yearsListId = `${formId}-years`;
  const brandsListId = `${formId}-brands`;
  const protectionsListId = `${formId}-protections`;
  const storagesListId = `${formId}-storages`;

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
            formId={formId}
            setsListId={setsListId}
            variationsListId={variationsListId}
            playersListId={playersListId}
            teamsListId={teamsListId}
            yearsListId={yearsListId}
            brandsListId={brandsListId}
            protectionsListId={protectionsListId}
            storagesListId={storagesListId}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type CardFormFieldsProps = {
  card?: Card | null;
  references: References;
  onClose: () => void;
  onSave: (card: Partial<Card>) => boolean | Promise<boolean>;
  manageReferences: boolean;
  onReferencesUpdated?: () => Promise<void>;
  saveError?: string | null;
  formId: string;
  setsListId: string;
  variationsListId: string;
  playersListId: string;
  teamsListId: string;
  yearsListId: string;
  brandsListId: string;
  protectionsListId: string;
  storagesListId: string;
};

function CardFormFields({
  card,
  references,
  onClose,
  onSave,
  manageReferences,
  onReferencesUpdated,
  saveError = null,
  formId,
  setsListId,
  variationsListId,
  playersListId,
  teamsListId,
  yearsListId,
  brandsListId,
  protectionsListId,
  storagesListId,
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
  const [addingBrand, setAddingBrand] = useState(false);
  const [addingSet, setAddingSet] = useState(false);
  const [saving, setSaving] = useState(false);

  const brandKey = (form.brand ?? "").trim();
  const setKey = (form.set ?? "").trim();
  const setsForBrand = useMemo(() => {
    if (!brandKey) {
      return references.sets;
    }
    const keyed = references.brandSets[brandKey];
    if (keyed && keyed.length > 0) {
      return keyed;
    }
    return [];
  }, [brandKey, references.brandSets, references.sets]);

  const variationsForSet = useMemo(() => {
    if (!setKey) {
      return references.variations;
    }
    const keyed = references.setVariations[setKey];
    if (keyed && keyed.length > 0) {
      return keyed;
    }
    return [];
  }, [setKey, references.setVariations, references.variations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const payload = buildCardWritePayload(form, gradingNote);
    const validationError = validateCardWritePayload(payload);
    if (validationError) {
      setRefError(t(validationError));
      return;
    }
    setRefError(null);
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
      const keyed = b ? references.brandSets[b] : undefined;
      const available =
        b && keyed && keyed.length > 0
          ? keyed
          : !b
            ? references.sets
            : [];
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
      const keyed = s ? references.setVariations[s] : undefined;
      const available =
        s && keyed && keyed.length > 0
          ? keyed
          : !s
            ? references.variations
            : [];
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
      return;
    }
    setRefError(null);
    setAddingBrand(true);
    try {
      await patchReferences({ action: "addBrand", brand: name });
      await onReferencesUpdated();
      setNewBrand("");
      update("brand", name);
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
      return;
    }
    if (!setName) {
      setRefError(t("cards.setNameRequired"));
      return;
    }
    setRefError(null);
    setAddingSet(true);
    try {
      await patchReferences({ action: "addSet", brand, set: setName });
      await onReferencesUpdated();
      setNewSet("");
      update("set", setName);
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
        <DialogTitle>{card ? t("cards.editTitle") : t("cards.addTitle")}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-player`}>{t("cards.player")}</Label>
              <Input
                id={`${formId}-player`}
                list={playersListId}
                value={form.player || ""}
                onChange={(e) => update("player", e.target.value)}
                required
              />
              <datalist id={playersListId}>
                {references.players.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-team`}>{t("cards.club")}</Label>
              <Input
                id={`${formId}-team`}
                list={teamsListId}
                value={form.team || ""}
                onChange={(e) => update("team", e.target.value)}
              />
              <datalist id={teamsListId}>
                {references.teams.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-year`}>{t("cards.year")}</Label>
              <Input
                id={`${formId}-year`}
                list={yearsListId}
                value={form.year || ""}
                onChange={(e) => update("year", e.target.value)}
              />
              <datalist id={yearsListId}>
                {references.years.map((y) => (
                  <option key={y} value={y} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor={`${formId}-brand`}>{t("cards.brand")}</Label>
              <Input
                id={`${formId}-brand`}
                list={brandsListId}
                value={form.brand || ""}
                onChange={(e) => updateBrand(e.target.value)}
              />
              <datalist id={brandsListId}>
                {references.brands.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
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
              <Input
                list={setsForBrand.length > 0 ? setsListId : undefined}
                value={form.set || ""}
                onChange={(e) => updateSet(e.target.value)}
              />
              {setsForBrand.length > 0 && (
                <datalist id={setsListId}>
                  {setsForBrand.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              )}
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
              <Input
                list={variationsForSet.length > 0 ? variationsListId : undefined}
                value={form.variation || ""}
                onChange={(e) => update("variation", e.target.value)}
              />
              {variationsForSet.length > 0 && (
                <datalist id={variationsListId}>
                  {variationsForSet.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              )}
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

            <div className="space-y-2">
              <Label>{t("cards.openingDate")}</Label>
              <Input
                value={form.openingDate || ""}
                onChange={(e) =>
                  update("openingDate", e.target.value || null)
                }
                placeholder={t("cards.placeholderDate")}
                inputMode="numeric"
              />
            </div>

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
              <Input
                list={protectionsListId}
                value={form.protection || ""}
                onChange={(e) => update("protection", e.target.value)}
              />
              <datalist id={protectionsListId}>
                {references.protections.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>{t("cards.storageOptional")}</Label>
              <Input
                list={storagesListId}
                value={form.storage || ""}
                onChange={(e) => update("storage", e.target.value)}
              />
              <datalist id={storagesListId}>
                {references.storages.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          {(saveError || refError) && (
            <p className="text-sm text-destructive" role="alert">
              {saveError ?? refError}
            </p>
          )}

          <div className="flex flex-wrap gap-6 pt-2">
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
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? t("common.saving")
                : card
                  ? t("common.save")
                  : t("cards.addCard")}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}
