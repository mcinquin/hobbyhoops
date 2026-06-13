"use client";

import { useState } from "react";
import type { DateLocale } from "@/lib/locale-date";
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

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={isEditing ? draft : formattedValue}
        onFocus={() => {
          setIsEditing(true);
          setDraft(formattedValue);
        }}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          const parsed = parseInput(next, locale);
          if (parsed) onChange(parsed);
          else if (!next.trim()) onChange(null);
        }}
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
