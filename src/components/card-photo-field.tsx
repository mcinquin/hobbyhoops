"use client";

import { useEffect, useId, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cardPhotoFileInputAccept } from "@/lib/card-photo-constants";
import { useTranslations } from "@/i18n/client";

type CardPhotoFieldProps = {
  side: "front" | "back";
  label: string;
  existingUrl: string | null;
  file: File | null;
  cleared: boolean;
  onFileChange: (file: File | null) => void;
  onClear: () => void;
  onRestore: () => void;
  disabled?: boolean;
};

export function CardPhotoField({
  side,
  label,
  existingUrl,
  file,
  cleared,
  onFileChange,
  onClear,
  onRestore,
  disabled = false,
}: CardPhotoFieldProps) {
  const t = useTranslations();
  const inputId = useId();
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const shownUrl = file ? previewUrl : cleared ? null : existingUrl;
  const hasExisting = Boolean(existingUrl) && !cleared && !file;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <input
        id={inputId}
        type="file"
        accept={cardPhotoFileInputAccept()}
        disabled={disabled}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted/80"
        onChange={(event) => {
          const next = event.target.files?.[0] ?? null;
          onFileChange(next);
        }}
      />
      <p className="text-xs text-muted-foreground">{t("cards.photoUploadHint")}</p>
      {shownUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shownUrl}
          alt={label}
          className="mt-1 max-h-36 w-auto rounded-md border border-border object-contain"
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {file ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onFileChange(null)}
          >
            {t("cards.photoCancelFile")}
          </Button>
        ) : null}
        {hasExisting ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onClear}
          >
            {t("cards.photoRemove", {
              side:
                side === "front"
                  ? t("cards.photoFrontShort")
                  : t("cards.photoBackShort"),
            })}
          </Button>
        ) : null}
        {cleared && existingUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onRestore}
          >
            {t("cards.photoRestore")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
