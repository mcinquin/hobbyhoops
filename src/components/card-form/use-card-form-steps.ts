"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CARD_FORM_STEPS, type CardFormStep } from "@/lib/card-form-steps";

interface UseCardFormStepsOptions {
  initialStep: CardFormStep;
  /** Every step starts as visited (e.g. when editing an existing card). */
  allVisited: boolean;
}

/**
 * Current step and visited steps of the card form. Showing a step moves focus
 * to its heading (or to a given field), for keyboard and screen-reader users.
 */
export function useCardFormSteps({ initialStep, allVisited }: UseCardFormStepsOptions) {
  const [step, setStep] = useState<CardFormStep>(initialStep);
  const [visited, setVisited] = useState<ReadonlySet<CardFormStep>>(() =>
    allVisited
      ? new Set(CARD_FORM_STEPS)
      : new Set(CARD_FORM_STEPS.slice(0, CARD_FORM_STEPS.indexOf(initialStep) + 1))
  );
  const headings = useRef(new Map<CardFormStep, HTMLHeadingElement>());

  const index = CARD_FORM_STEPS.indexOf(step);

  /** Shows a step (rendered synchronously so the focus target is visible), then focuses it. */
  function show(next: CardFormStep, focusElementId?: string) {
    flushSync(() => {
      setStep(next);
      setVisited((prev) => (prev.has(next) ? prev : new Set([...prev, next])));
    });
    const target =
      (focusElementId ? document.getElementById(focusElementId) : null) ??
      headings.current.get(next);
    target?.focus();
  }

  /** Ref callback for the heading of a step panel. */
  const headingRef = (panelStep: CardFormStep) => (el: HTMLHeadingElement | null) => {
    if (el) headings.current.set(panelStep, el);
    else headings.current.delete(panelStep);
  };

  return {
    step,
    index,
    isFirst: index === 0,
    isLast: index === CARD_FORM_STEPS.length - 1,
    nextStep: CARD_FORM_STEPS[index + 1] ?? null,
    previousStep: CARD_FORM_STEPS[index - 1] ?? null,
    visited,
    show,
    headingRef,
  };
}

/** Value returned by {@link useCardFormSteps}. */
export type CardFormSteps = ReturnType<typeof useCardFormSteps>;
