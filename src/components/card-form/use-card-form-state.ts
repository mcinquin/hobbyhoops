"use client";

import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import type { Card, References } from "@/lib/types";
import { splitGrading } from "@/lib/card-write";
import {
  setsLinkedToBrand,
  variationsLinkedToBrandSet,
} from "@/lib/reference-suggestions";
import { recognizeCardPhoto } from "@/lib/cards-client";
import type { CardRecognitionSuggestion } from "@/lib/card-recognition/types";
import {
  applyRecognitionSuggestion,
  type RecognitionPrefillField,
} from "@/lib/recognition-prefill";
import { isLocalCardPhotoUrl } from "@/lib/card-photo-constants";
import { useTranslations } from "@/i18n/client";
import { usePendingPhoto } from "./use-pending-photo";

export type { PendingPhoto } from "./use-pending-photo";

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
  photoFront: null,
  photoBack: null,
  tradable: false,
  rookie: false,
  wnba: false,
  notes: "",
};

/** Updates a single field of the card being edited. */
export type UpdateCardField = (field: keyof Card, value: unknown) => void;

/**
 * State of the card form: field values with brand → set → variation cascade,
 * grade note, pending photos, inline feedback and CardSight recognition.
 */
export function useCardFormState(
  card: Partial<Card> | null | undefined,
  references: References
) {
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognizeNote, setRecognizeNote] = useState<string | null>(null);
  const front = usePendingPhoto();
  const back = usePendingPhoto();

  const brandKey = (form.brand ?? "").trim();
  const setKey = (form.set ?? "").trim();
  const setsForBrand = useMemo(
    () => setsLinkedToBrand(references, brandKey),
    [brandKey, references]
  );
  const variationsForSet = useMemo(
    () => variationsLinkedToBrandSet(references, brandKey, setKey),
    [brandKey, references, setKey]
  );

  const update: UpdateCardField = (field, value) => {
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
      const available = variationsLinkedToBrandSet(
        references,
        (prev.brand ?? "").trim(),
        s
      );
      let nextVariation = prev.variation ?? "";
      if (s && available.length > 0 && nextVariation && !available.includes(nextVariation)) {
        nextVariation = "";
      }
      return { ...prev, set: value, variation: nextVariation };
    });
  };

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  /** Photo recto disponible : fichier frais, ou photo locale déjà stockée. */
  const storedFrontAvailable = Boolean(
    card?.id &&
      form.photoFront &&
      isLocalCardPhotoUrl(form.photoFront) &&
      !front.cleared
  );
  const canRecognize = Boolean(front.file) || storedFrontAvailable;

  const prefillLabels: Record<RecognitionPrefillField, string> = {
    player: t("cards.player"),
    year: t("cards.year"),
    brand: t("cards.brand"),
    set: t("cards.set"),
    variation: t("cards.variation"),
    cardNumber: t("cards.cardNum"),
    serialNumber: t("cards.serialNum"),
    rookie: t("badges.rookie"),
    autograph: t("cards.autograph"),
    memorabilia: t("cards.memorabiliaLabel"),
  };

  /**
   * Préremplit uniquement les champs vides ; n'écrase jamais une saisie.
   * `flushSync` exécute l'updater tout de suite (on est après un `await`) pour
   * savoir quels champs ont été remplis — sinon la liste serait encore vide.
   */
  function applySuggestion(suggestion: CardRecognitionSuggestion): string[] {
    let applied: RecognitionPrefillField[] = [];
    flushSync(() => {
      setForm((prev) => {
        const result = applyRecognitionSuggestion(prev, suggestion);
        applied = result.applied;
        return result.form;
      });
    });
    return applied.map((field) => prefillLabels[field]);
  }

  async function handleRecognize() {
    const source = front.file
      ? front.file
      : storedFrontAvailable && card?.id
        ? ({ cardId: card.id, side: "front" } as const)
        : null;
    if (!source || recognizing) return;

    resetFeedback();
    setRecognizeNote(null);
    setRecognizing(true);
    try {
      const result = await recognizeCardPhoto(source);
      if (!result.suggestion) {
        setRecognizeNote(t("cards.recognizeNoMatch"));
        return;
      }
      const applied = applySuggestion(result.suggestion);
      setSuccess(
        applied.length > 0
          ? t("cards.recognizeApplied", { fields: applied.join(", ") })
          : t("cards.recognizeNoEmptyFields")
      );
      if (
        result.suggestion.confidence !== "high" ||
        result.suggestion.variationUncertain
      ) {
        setRecognizeNote(t("cards.recognizeLowConfidence"));
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : t("errors.recognizeFailed")
      );
    } finally {
      setRecognizing(false);
    }
  }

  return {
    form,
    update,
    updateBrand,
    updateSet,
    brandKey,
    setKey,
    setsForBrand,
    variationsForSet,
    gradingNote,
    setGradingNote,
    photos: { front, back },
    feedback: { error, success, setError, setSuccess, reset: resetFeedback },
    recognition: {
      canRecognize,
      recognizing,
      note: recognizeNote,
      recognize: handleRecognize,
    },
  };
}

/** Value returned by {@link useCardFormState}. */
export type CardFormState = ReturnType<typeof useCardFormState>;
