"use client";

import { useId, useState } from "react";
import type { Card, References } from "@/lib/types";
import { buildCardWritePayload } from "@/lib/card-write";
import {
  CARD_FORM_STEPS,
  validateCardForm,
  validateCardFormStep,
  type CardFormStep,
  type CardStepError,
} from "@/lib/card-form-steps";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTranslations } from "@/i18n/client";
import { useCardFormState } from "./use-card-form-state";
import { useCardFormSteps } from "./use-card-form-steps";
import { CardFormStepper } from "./card-form-stepper";
import { CardFormStepPanel } from "./card-form-step-panel";
import { CardFormFooter, type CardFormSecondaryAction } from "./card-form-footer";
import { IdentitySection } from "./identity-section";
import { CatalogSection } from "./catalog-section";
import { NumberingSection } from "./numbering-section";
import { ConditionSection } from "./condition-section";
import { PhotosSection } from "./photos-section";
import { CardSummary } from "./card-summary";
import { syncPendingPhotos } from "./sync-pending-photos";
import { FIELD_LABEL_KEYS } from "./field-label-keys";

/** From this width the stepper behaves like tabs: every step can be opened directly. */
const FREE_NAVIGATION_QUERY = "(min-width: 768px)";

interface CardFormProps {
  card?: Partial<Card> | null;
  references: References;
  open: boolean;
  onClose: () => void;
  /** Persiste la carte et renvoie l’enregistrement sauvé (pour enchaîner l’upload photos). */
  onSave: (card: Partial<Card>) => Card | false | Promise<Card | false>;
  /** Appelé après sauvegarde + upload photos réussis, juste avant onClose. */
  onSaved?: (card: Card) => void;
  saveError?: string | null;
  dialogTitle?: string;
  submitLabel?: string;
  secondaryAction?: CardFormSecondaryAction;
}

/**
 * Create / edit card dialog in four steps (photos, identity, catalog,
 * condition & storage), with photo upload and CardSight prefill.
 * A new card starts on the photo step; an existing one on the identity step.
 */
export function CardForm({ open, onClose, ...rest }: CardFormProps) {
  const formId = useId();
  const formSeed = open ? (rest.card?.id ?? "create") : "closed";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        {open ? (
          <CardFormFields key={formSeed} {...rest} onClose={onClose} formId={formId} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type CardFormFieldsProps = Omit<CardFormProps, "open"> & { formId: string };

function CardFormFields({
  card,
  references,
  onClose,
  onSave,
  onSaved,
  saveError = null,
  dialogTitle,
  submitLabel,
  secondaryAction,
  formId,
}: CardFormFieldsProps) {
  const t = useTranslations();
  const state = useCardFormState(card, references);
  const { form, feedback } = state;
  const isEditing = Boolean(card?.id);
  const steps = useCardFormSteps({
    initialStep: isEditing ? "identity" : "photos",
    allVisited: isEditing,
  });
  const isFreeNavigation = useMediaQuery(FREE_NAVIGATION_QUERY);
  const [saving, setSaving] = useState(false);

  /** Shows the error on its step and focuses the field (or the step heading). */
  function reportStepError(error: CardStepError) {
    feedback.setError(
      error.messageKey
        ? t(error.messageKey)
        : t("cards.steps.fieldInvalid", { field: t(FIELD_LABEL_KEYS[error.field]) })
    );
    feedback.setSuccess(null);
    steps.show(error.step, `${formId}-${error.field}`);
  }

  /** Moves to a step; going forward first validates the current step's fields. */
  function goTo(target: CardFormStep) {
    if (CARD_FORM_STEPS.indexOf(target) > steps.index) {
      const error = validateCardFormStep(steps.step, form, state.gradingNote);
      if (error) {
        reportStepError(error);
        return;
      }
    }
    feedback.setError(null);
    steps.show(target);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    // Enter on an intermediate step of a new card moves on instead of saving.
    if (!isEditing && steps.nextStep) {
      goTo(steps.nextStep);
      return;
    }
    const validationError = validateCardForm(form, state.gradingNote);
    if (validationError) {
      reportStepError(validationError);
      return;
    }
    feedback.reset();
    setSaving(true);
    try {
      const saved = await onSave(
        buildCardWritePayload(form, state.gradingNote) as Partial<Card>
      );
      if (!saved) {
        return;
      }
      onSaved?.(await syncPendingPhotos(saved, state.photos));
      onClose();
    } catch (err) {
      feedback.setError(
        err instanceof Error && err.message ? err.message : t("errors.updateFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  const panel = (step: CardFormStep) => ({
    step,
    isActive: steps.step === step,
    headingRef: steps.headingRef(step),
  });

  return (
    <>
      <DialogHeader className="space-y-3">
        <DialogTitle>
          {dialogTitle ?? (card ? t("cards.editTitle") : t("cards.addTitle"))}
        </DialogTitle>
        <CardFormStepper
          current={steps.step}
          visited={steps.visited}
          isFreeNavigation={isFreeNavigation}
          onSelect={goTo}
        />
      </DialogHeader>
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <CardFormStepPanel {...panel("photos")}>
          <PhotosSection
            form={form}
            photos={state.photos}
            recognition={state.recognition}
            isSaving={saving}
            onSkip={() => goTo("identity")}
          />
        </CardFormStepPanel>

        <CardFormStepPanel {...panel("identity")}>
          <IdentitySection formId={formId} references={references} state={state} />
        </CardFormStepPanel>

        <CardFormStepPanel {...panel("catalog")}>
          <CatalogSection
            formId={formId}
            references={references}
            state={state}
          />
          <NumberingSection formId={formId} state={state} />
        </CardFormStepPanel>

        <CardFormStepPanel {...panel("condition")}>
          <ConditionSection formId={formId} references={references} state={state} />
          <CardSummary form={form} front={state.photos.front} />
        </CardFormStepPanel>

        <AdminFeedback
          success={feedback.success}
          error={saveError ?? feedback.error}
          onSuccessDismiss={() => feedback.setSuccess(null)}
        />

        <CardFormFooter
          isFirstStep={steps.isFirst}
          isLastStep={steps.isLast}
          canSaveAnyStep={isEditing}
          isSaving={saving}
          submitLabel={submitLabel ?? (isEditing ? t("common.save") : t("cards.addCard"))}
          secondaryAction={secondaryAction}
          onBack={() => steps.previousStep && goTo(steps.previousStep)}
          onNext={() => steps.nextStep && goTo(steps.nextStep)}
          onCancel={onClose}
        />
      </form>
    </>
  );
}
