"use client";

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

/** Card form block: front / back photos and the CardSight "Recognize" button. */
export function PhotosSection({
  form,
  photos,
  recognition,
  isSaving,
}: PhotosSectionProps) {
  const t = useTranslations();
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
            {recognition.recognizing ? t("cards.recognizing") : t("cards.recognize")}
          </Button>
          {recognition.note ? (
            <p className="text-xs text-muted-foreground">{recognition.note}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
