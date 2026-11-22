"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { useTranslations } from "@/i18n/client";

/** Extra footer action (e.g. delete the shipment the card comes from). */
export type CardFormSecondaryAction = {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
};

interface CardFormFooterProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  /** Saving is offered on every step (existing card), not only on the last one. */
  canSaveAnyStep: boolean;
  isSaving: boolean;
  submitLabel: string;
  secondaryAction?: CardFormSecondaryAction;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
}

/** Card form buttons: Cancel, Back, Next and the submit button. */
export function CardFormFooter({
  isFirstStep,
  isLastStep,
  canSaveAnyStep,
  isSaving,
  submitLabel,
  secondaryAction,
  onBack,
  onNext,
  onCancel,
}: CardFormFooterProps) {
  const t = useTranslations();
  const showSubmit = isLastStep || canSaveAnyStep;
  return (
    <DialogFooter>
      {secondaryAction ? (
        <Button
          type="button"
          variant="ghost"
          className="mr-auto"
          disabled={isSaving || secondaryAction.disabled}
          onClick={() => void secondaryAction.onClick()}
        >
          {secondaryAction.label}
        </Button>
      ) : null}
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
        {t("common.cancel")}
      </Button>
      {isFirstStep ? null : (
        <Button type="button" variant="outline" onClick={onBack} disabled={isSaving}>
          <ArrowLeft className="size-4" aria-hidden />
          {t("cards.steps.back")}
        </Button>
      )}
      {isLastStep ? null : (
        <Button
          type="button"
          variant={showSubmit ? "secondary" : "default"}
          onClick={onNext}
          disabled={isSaving}
        >
          {t("cards.steps.next")}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      )}
      {showSubmit ? (
        <Button type="submit" disabled={isSaving || secondaryAction?.disabled}>
          {isSaving ? t("common.saving") : submitLabel}
        </Button>
      ) : null}
    </DialogFooter>
  );
}
