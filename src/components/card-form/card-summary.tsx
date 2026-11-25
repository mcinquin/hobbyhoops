"use client";

import type { Card } from "@/lib/types";
import { CardBadges } from "@/components/card-badges";
import { useCardBadgeLabels } from "@/hooks/use-card-badge-labels";
import { useObjectUrl } from "@/hooks/use-object-url";
import { useTranslations } from "@/i18n/client";
import type { PendingPhoto } from "./use-card-form-state";

interface CardSummaryProps {
  form: Partial<Card>;
  front: PendingPhoto;
}

/** One-line description of the card being saved: identity, catalog and numbering. */
export function describeCard(form: Partial<Card>): string {
  const catalog = [form.year, form.brand, form.set, form.variation]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return [
    form.player?.trim(),
    catalog,
    form.cardNumber?.trim() ? `#${form.cardNumber.trim()}` : "",
    form.serialNumber?.trim(),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Summary shown on the last step before saving: front photo, description and badges. */
export function CardSummary({ form, front }: CardSummaryProps) {
  const t = useTranslations();
  const badgeLabels = useCardBadgeLabels();
  const previewUrl = useObjectUrl(front.file);
  const photoUrl = front.file ? previewUrl : front.cleared ? null : (form.photoFront ?? null);

  return (
    <div className="col-span-2 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t("cards.steps.summary")}</p>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={t("cards.photoFront")}
            className="h-16 w-12 shrink-0 rounded border border-border object-cover"
          />
        ) : (
          <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded border border-dashed border-border text-center text-[10px] text-muted-foreground">
            {t("cards.steps.summaryNoPhoto")}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium break-words" data-testid="card-summary">
            {describeCard(form) || "—"}
          </p>
          <CardBadges
            card={{
              rookie: Boolean(form.rookie),
              autograph: Boolean(form.autograph),
              memorabilia: Boolean(form.memorabilia),
              serialNumber: form.serialNumber ?? null,
              tradable: Boolean(form.tradable),
              wnba: Boolean(form.wnba),
              investment: Boolean(form.investment),
              soldAt: form.soldAt ?? null,
            }}
            labels={badgeLabels}
          />
        </div>
      </div>
    </div>
  );
}
