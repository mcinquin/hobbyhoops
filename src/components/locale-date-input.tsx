"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { DateLocale } from "@/lib/locale-date";
import {
  autoFormatSlashedDateInput,
  caretIndexAfterDigitCount,
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
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionToRestoreRef = useRef<{ start: number; end: number } | null>(
    null
  );

  useLayoutEffect(() => {
    const pending = selectionToRestoreRef.current;
    const el = inputRef.current;
    if (!pending || !el) return;
    selectionToRestoreRef.current = null;
    el.setSelectionRange(pending.start, pending.end);
  });

  function handleDraftChange(raw: string, el: HTMLInputElement) {
    const cursorPos = el.selectionStart ?? raw.length;
    const digitsBeforeCursor = raw.slice(0, cursorPos).replace(/\D/g, "").length;

    if (ISO_DATE_REGEX.test(raw.trim())) {
      const trimmed = raw.trim();
      const formatted = formatIsoDateForInput(trimmed, locale);
      prevDigitLengthRef.current = formatted.replace(/\D/g, "").length;
      selectionToRestoreRef.current = {
        start: formatted.length,
        end: formatted.length,
      };
      setDraft(formatted);
      onChange(trimmed);
      return;
    }

    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const isAdding = digits.length > prevDigitLengthRef.current;
    prevDigitLengthRef.current = digits.length;
    const next = autoFormatSlashedDateInput(raw, {
      appendTrailingSlash: isAdding,
    });
    const nextCaret =
      digitsBeforeCursor >= digits.length
        ? next.length
        : caretIndexAfterDigitCount(next, digitsBeforeCursor);
    selectionToRestoreRef.current = { start: nextCaret, end: nextCaret };
    setDraft(next);
    const parsed = parseInput(next, locale);
    if (parsed) onChange(parsed);
    else if (!next.trim()) onChange(null);
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={inputRef}
        id={id}
        value={isEditing ? draft : formattedValue}
        onFocus={(e) => {
          const el = e.currentTarget;
          selectionToRestoreRef.current = {
            start: el.selectionStart ?? 0,
            end: el.selectionEnd ?? 0,
          };
          setIsEditing(true);
          setDraft(formattedValue);
          prevDigitLengthRef.current = formattedValue.replace(/\D/g, "").length;
        }}
        onChange={(e) => handleDraftChange(e.target.value, e.currentTarget)}
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
