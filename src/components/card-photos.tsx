"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";
import { Maximize2, RefreshCw, XIcon, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

type CardPhotosProps = {
  player: string;
  photoFront: string | null;
  photoBack: string | null;
  loading?: boolean;
  className?: string;
};

export function CardPhotos({
  player,
  photoFront,
  photoBack,
  loading = false,
  className,
}: CardPhotosProps) {
  const t = useTranslations();
  const titleId = useId();
  const [showBack, setShowBack] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [actualSize, setActualSize] = useState(false);

  const hasPhotos = Boolean(photoFront || photoBack);
  const activePhoto = showBack ? photoBack : photoFront;
  const canFlip = Boolean(photoFront && photoBack);
  const sideLabel =
    showBack && photoBack ? t("cards.photoBack") : t("cards.photoFront");
  const sideAlt =
    showBack && photoBack
      ? t("cards.photoBackAlt", { player })
      : t("cards.photoFrontAlt", { player });

  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen]);

  if (loading) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {t("cards.photosLoading")}
      </p>
    );
  }

  if (!hasPhotos) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{sideLabel}</p>
        <div className="flex flex-wrap gap-2">
          {canFlip ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowBack((prev) => !prev)}
            >
              <RefreshCw className="mr-1 size-3.5" aria-hidden />
              {showBack ? t("cards.showFront") : t("cards.showBack")}
            </Button>
          ) : null}
          {activePhoto ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActualSize(false);
                setLightboxOpen(true);
              }}
            >
              <Maximize2 className="mr-1 size-3.5" aria-hidden />
              {t("cards.enlargePhoto")}
            </Button>
          ) : null}
        </div>
      </div>

      {activePhoto ? (
        <button
          type="button"
          className="group relative mx-auto block w-full max-w-[22rem] overflow-hidden rounded-lg border border-border bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            setActualSize(false);
            setLightboxOpen(true);
          }}
          aria-label={t("cards.enlargePhoto")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activePhoto}
            alt={sideAlt}
            className="mx-auto max-h-[min(70vh,36rem)] w-full object-contain"
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 py-2 text-left text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {t("cards.enlargePhotoHint")}
          </span>
        </button>
      ) : (
        <p className="text-sm text-muted-foreground">
          {showBack ? t("cards.photoBackMissing") : t("cards.photoFrontMissing")}
        </p>
      )}

      {lightboxOpen && activePhoto
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex flex-col bg-black/90"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-white">
                <p id={titleId} className="text-sm font-medium">
                  {sideLabel} — {player}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {canFlip ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowBack((prev) => !prev)}
                    >
                      <RefreshCw className="mr-1 size-3.5" aria-hidden />
                      {showBack ? t("cards.showFront") : t("cards.showBack")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setActualSize((prev) => !prev)}
                  >
                    {actualSize ? (
                      <ZoomOut className="mr-1 size-3.5" aria-hidden />
                    ) : (
                      <ZoomIn className="mr-1 size-3.5" aria-hidden />
                    )}
                    {actualSize
                      ? t("cards.photoFitScreen")
                      : t("cards.photoActualSize")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    aria-label={t("common.close")}
                    onClick={() => setLightboxOpen(false)}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              </div>

              <div
                className={cn(
                  "min-h-0 flex-1",
                  actualSize
                    ? "overflow-auto p-4"
                    : "flex items-center justify-center overflow-hidden p-4"
                )}
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    setLightboxOpen(false);
                  }
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activePhoto}
                  alt={sideAlt}
                  className={cn(
                    "rounded-sm",
                    actualSize
                      ? "mx-auto max-w-none"
                      : "max-h-full max-w-full object-contain"
                  )}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
