"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import type { Card } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CardPhotoField } from "@/components/card-photo-field";
import { useTranslations } from "@/i18n/client";
import type { CardFormState, PendingPhoto } from "./use-card-form-state";

interface PhotosSectionProps {
  form: Partial<Card>;
  photos: CardFormState["photos"];
  recognition: CardFormState["recognition"];
  isSaving: boolean;
  /** Moves on to the next step; offered while the card has no photo at all. */
  onSkip: () => void;
}

function PhotoCell({
  side,
  label,
  existingUrl,
  photo,
  disabled,
}: {
  side: "front" | "back";
  label: string;
  existingUrl: string | null;
  photo: PendingPhoto;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <CardPhotoField
        side={side}
        label={label}
        existingUrl={existingUrl}
        file={photo.file}
        cleared={photo.cleared}
        disabled={disabled}
        onFileChange={photo.change}
        onClear={photo.clear}
        onRestore={photo.restore}
      />
    </div>
  );
}

function hasPhoto(photo: PendingPhoto, existingUrl: string | null | undefined): boolean {
  return Boolean(photo.file) || (Boolean(existingUrl) && !photo.cleared);
}

/**
 * Photos step: front / back photos and the CardSight "Recognize" button, which
 * pre-fills the following steps.
 */
export function PhotosSection({
  form,
  photos,
  recognition,
  isSaving,
  onSkip,
}: PhotosSectionProps) {
  const t = useTranslations();
  const hasAnyPhoto =
    hasPhoto(photos.front, form.photoFront) || hasPhoto(photos.back, form.photoBack);
  return (
    <>
      <PhotoCell
        side="front"
        label={t("cards.photoFront")}
        existingUrl={form.photoFront ?? null}
        photo={photos.front}
        disabled={isSaving}
      />
      <PhotoCell
        side="back"
        label={t("cards.photoBack")}
        existingUrl={form.photoBack ?? null}
        photo={photos.back}
        disabled={isSaving}
      />

      {recognition.canRecognize ? (
        <div className="space-y-1 col-span-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={recognition.recognizing || isSaving}
            onClick={() => void recognition.recognize()}
          >
            <Sparkles className="size-4" aria-hidden />
            {recognition.recognizing ? t("cards.recognizing") : t("cards.recognize")}
          </Button>
          {recognition.note ? (
            <p className="text-xs text-muted-foreground">{recognition.note}</p>
          ) : null}
        </div>
      ) : null}

      {hasAnyPhoto ? null : (
        <div className="col-span-2">
          <Button type="button" variant="link" size="sm" className="px-0" onClick={onSkip}>
            {t("cards.steps.skipPhotos")}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </>
  );
}
