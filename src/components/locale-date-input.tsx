"use client";

import { useRef, useState } from "react";
import type { DateLocale } from "@/lib/locale-date";
import {
  autoFormatSlashedDateInput,
  formatIsoDateForInput,
  ISO_DATE_REGEX,
} from "@/lib/locale-date";
import { useI18n, useTranslations } from "@/i18n/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LocaleDateInputProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  formatForInput: (value: string | null, locale: DateLocale) => string;
  parseInput: (input: string, locale: DateLocale) => string | null;
  disabled?: boolean;
}

export function LocaleDateInput({
  id,
  label,
  value,
  onChange,
  formatForInput,
  parseInput,
  disabled = false,
}: LocaleDateInputProps) {
  const { locale } = useI18n();
  const t = useTranslations();
  const formattedValue = formatForInput(value, locale);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(formattedValue);
  const prevDigitLengthRef = useRef(formattedValue.replace(/\D/g, "").length);

  function handleDraftChange(raw: string) {
    const trimmed = raw.trim();
    if (ISO_DATE_REGEX.test(trimmed)) {
      const formatted = formatIsoDateForInput(trimmed, locale);
      prevDigitLengthRef.current = formatted.replace(/\D/g, "").length;
      setDraft(formatted);
      onChange(trimmed);
      return;
    }

    const digits = raw.replace(/\D/g, "");
    const isAdding = digits.length > prevDigitLengthRef.current.length;
    prevDigitLengthRef.current = digits.length;
    const next = autoFormatSlashedDateInput(raw, {
      appendTrailingSlash: isAdding,
    });
    setDraft(next);
    const parsed = parseInput(next, locale);
    if (parsed) onChange(parsed);
    else if (!next.trim()) onChange(null);
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={isEditing ? draft : formattedValue}
        onFocus={() => {
          setIsEditing(true);
          setDraft(formattedValue);
          prevDigitLengthRef.current = formattedValue.replace(/\D/g, "").length;
        }}
        onChange={(e) => handleDraftChange(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          const parsed = parseInput(draft, locale);
          if (parsed) {
            onChange(parsed);
            return;
          }
          if (!draft.trim()) {
            onChange(null);
            return;
          }
        }}
        placeholder={t("cards.placeholderDate")}
        inputMode="numeric"
        disabled={disabled}
        autoComplete="off"
      />
    </div>
  );
}
