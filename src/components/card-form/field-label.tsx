"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/i18n/client";

/** ✨ marker for a value filled in by CardSight recognition. */
export function PrefillMarker() {
  const t = useTranslations();
  const label = t("cards.steps.prefilled");
  return (
    <span className="inline-flex shrink-0 text-amber-500" title={label}>
      <Sparkles className="size-3.5" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

interface FieldLabelProps {
  htmlFor?: string;
  children: ReactNode;
  /** Shows the recognition marker next to the label (outside it, so the field name is unchanged). */
  isPrefilled?: boolean;
}

/** Form field label, with the recognition marker when the value was pre-filled. */
export function FieldLabel({ htmlFor, children, isPrefilled = false }: FieldLabelProps) {
  if (!isPrefilled) return <Label htmlFor={htmlFor}>{children}</Label>;
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <PrefillMarker />
    </div>
  );
}
