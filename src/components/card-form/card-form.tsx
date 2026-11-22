"use client";

import { useId, useState } from "react";
import type { Card, References } from "@/lib/types";
import {
  buildCardWritePayload,
  validateCardSerialInput,
  validateCardWritePayload,
} from "@/lib/card-write";
import { deleteCardPhotoFile, updateCard, uploadCardPhoto } from "@/lib/cards-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { useTranslations } from "@/i18n/client";
import { useCardFormState, type CardFormState } from "./use-card-form-state";
import { IdentitySection } from "./identity-section";
import { CatalogSection } from "./catalog-section";
import { NumberingSection } from "./numbering-section";
import { ConditionSection } from "./condition-section";
import { PhotosSection } from "./photos-section";
import { FlagsSection } from "./flags-section";

type SecondaryAction = {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
};

interface CardFormProps {
  card?: Partial<Card> | null;
  references: References;
  open: boolean;
  onClose: () => void;
  /** Persiste la carte et renvoie l’enregistrement sauvé (pour enchaîner l’upload photos). */
  onSave: (card: Partial<Card>) => Card | false | Promise<Card | false>;
  /** Appelé après sauvegarde + upload photos réussis, juste avant onClose. */
  onSaved?: (card: Card) => void;
  /** Affiche l’ajout de marques/sets dans le formulaire (requiert `onReferencesUpdated`). */
  manageReferences?: boolean;
  /** Après ajout marque/set via l’API, recharger les références (ex. refetch GET /api/references). */
  onReferencesUpdated?: () => Promise<void>;
  saveError?: string | null;
  dialogTitle?: string;
  submitLabel?: string;
  secondaryAction?: SecondaryAction;
}

/** Create / edit card dialog, with photo upload and CardSight prefill. */
export function CardForm({ open, onClose, ...rest }: CardFormProps) {
  const formId = useId();
  const formSeed = open ? (rest.card?.id ?? "create") : "closed";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {open ? (
          <CardFormFields key={formSeed} {...rest} onClose={onClose} formId={formId} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type CardFormFieldsProps = Omit<CardFormProps, "open"> & { formId: string };

/** Uploads / deletes pending photos after save; returns the card with final photo URLs. */
async function syncPendingPhotos(
  saved: Card,
  { front, back }: CardFormState["photos"]
): Promise<Card> {
  let photoFront = saved.photoFront ?? null;
  let photoBack = saved.photoBack ?? null;
  let photosChanged = false;

  if (front.cleared && !front.file) {
    await deleteCardPhotoFile(saved.id, "front");
    photoFront = null;
    photosChanged = true;
  }
  if (back.cleared && !back.file) {
    await deleteCardPhotoFile(saved.id, "back");
    photoBack = null;
    photosChanged = true;
  }
  if (front.file) {
    photoFront = await uploadCardPhoto(saved.id, "front", front.file);
    photosChanged = true;
  }
  if (back.file) {
    photoBack = await uploadCardPhoto(saved.id, "back", back.file);
    photosChanged = true;
  }

  return photosChanged ? updateCard({ ...saved, photoFront, photoBack }) : saved;
}

function CardFormFields({
  card,
  references,
  onClose,
  onSave,
  onSaved,
  manageReferences = true,
  onReferencesUpdated,
  saveError = null,
  dialogTitle,
  submitLabel,
  secondaryAction,
  formId,
}: CardFormFieldsProps) {
  const t = useTranslations();
  const state = useCardFormState(card, references);
  const { form, update, feedback } = state;
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const payload = buildCardWritePayload(form, state.gradingNote);
    const validationError =
      validateCardSerialInput(form.serialNumber) ??
      validateCardWritePayload(payload);
    if (validationError) {
      feedback.setError(t(validationError));
      feedback.setSuccess(null);
      return;
    }
    feedback.reset();
    setSaving(true);
    try {
      const saved = await onSave(payload as Partial<Card>);
      if (!saved) {
        return;
      }
      onSaved?.(await syncPendingPhotos(saved, state.photos));
      onClose();
    } catch (err) {
      feedback.setError(
        err instanceof Error && err.message
          ? err.message
          : t("errors.updateFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {dialogTitle ?? (card ? t("cards.editTitle") : t("cards.addTitle"))}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <IdentitySection
            formId={formId}
            form={form}
            references={references}
            update={update}
          />
          <CatalogSection
            formId={formId}
            references={references}
            state={state}
            onReferencesUpdated={manageReferences ? onReferencesUpdated : undefined}
          />
          <NumberingSection formId={formId} form={form} update={update} />
          <ConditionSection
            form={form}
            references={references}
            update={update}
            gradingNote={state.gradingNote}
            onGradingNoteChange={state.setGradingNote}
          />
          <PhotosSection
            form={form}
            photos={state.photos}
            recognition={state.recognition}
            isSaving={saving}
          />

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
          success={feedback.success}
          error={saveError ?? feedback.error}
          onSuccessDismiss={() => feedback.setSuccess(null)}
        />

        <FlagsSection form={form} update={update} />

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
