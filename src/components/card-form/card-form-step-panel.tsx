"use client";

import { useId, type ReactNode, type Ref } from "react";
import { CARD_FORM_STEPS, type CardFormStep } from "@/lib/card-form-steps";
import { useTranslations } from "@/i18n/client";
import { STEP_LABEL_KEYS } from "./card-form-stepper";

interface CardFormStepPanelProps {
  step: CardFormStep;
  isActive: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  children: ReactNode;
}

/**
 * One step of the card form. Inactive steps stay mounted (hidden) so nothing
 * typed is lost when moving between steps.
 */
export function CardFormStepPanel({
  step,
  isActive,
  headingRef,
  children,
}: CardFormStepPanelProps) {
  const t = useTranslations();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} hidden={!isActive} className="space-y-4">
      <h3
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="flex items-baseline justify-between gap-2 text-sm font-semibold outline-none"
      >
        {t(STEP_LABEL_KEYS[step])}
        <span className="text-xs font-normal text-muted-foreground">
          {t("cards.steps.progress", {
            current: CARD_FORM_STEPS.indexOf(step) + 1,
            total: CARD_FORM_STEPS.length,
          })}
        </span>
      </h3>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </section>
  );
}
