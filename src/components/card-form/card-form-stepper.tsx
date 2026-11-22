"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { CARD_FORM_STEPS, type CardFormStep } from "@/lib/card-form-steps";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

/** i18n key of each step name. */
export const STEP_LABEL_KEYS: Record<CardFormStep, string> = {
  photos: "cards.steps.photos",
  identity: "cards.steps.identity",
  catalog: "cards.steps.catalog",
  condition: "cards.steps.condition",
};

interface CardFormStepperProps {
  current: CardFormStep;
  visited: ReadonlySet<CardFormStep>;
  /** Every step is reachable (tab-like navigation on large screens). */
  isFreeNavigation: boolean;
  onSelect: (step: CardFormStep) => void;
}

/** Step indicator; visited steps (or all, in free navigation) can be clicked. */
export function CardFormStepper({
  current,
  visited,
  isFreeNavigation,
  onSelect,
}: CardFormStepperProps) {
  const t = useTranslations();
  const currentIndex = CARD_FORM_STEPS.indexOf(current);

  return (
    <nav aria-label={t("cards.steps.label")}>
      <ol className="flex items-center gap-1 text-xs sm:gap-2">
        {CARD_FORM_STEPS.map((step, index) => {
          const isCurrent = step === current;
          const isDone = index < currentIndex && visited.has(step);
          const isReachable = !isCurrent && (isFreeNavigation || visited.has(step));
          return (
            <li key={step} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              {index > 0 ? (
                <span aria-hidden className="h-px w-2 shrink-0 bg-border sm:w-4" />
              ) : null}
              <button
                type="button"
                disabled={!isReachable && !isCurrent}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => isReachable && onSelect(step)}
                className={cn(
                  "flex min-w-0 items-center gap-1.5 rounded-md px-1 py-1 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                  isReachable && "hover:text-foreground",
                  !isReachable && !isCurrent && "cursor-not-allowed opacity-60"
                )}
              >
                <StepDot isCurrent={isCurrent} isDone={isDone}>
                  {index + 1}
                </StepDot>
                <span className={cn("truncate", !isCurrent && "hidden sm:inline")}>
                  {t(STEP_LABEL_KEYS[step])}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepDot({
  isCurrent,
  isDone,
  children,
}: {
  isCurrent: boolean;
  isDone: boolean;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
        isCurrent && "border-primary bg-primary text-primary-foreground",
        isDone && "border-primary text-primary",
        !isCurrent && !isDone && "border-border"
      )}
    >
      {isDone ? <Check className="size-3" /> : children}
    </span>
  );
}
