"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatCentsAsAmount, parseAmountToCents } from "@/lib/money";
import { cn } from "@/lib/utils";

interface AmountInputProps {
  id: string;
  /** Amount in cents; `NaN` keeps an invalid typed amount as is. */
  value: number | null;
  onChange: (cents: number | null) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

/** Whether the typed amount already matches the value (NaN = invalid input kept as typed). */
function isInSync(text: string, cents: number | null): boolean {
  if (cents != null && Number.isNaN(cents)) return true;
  return parseAmountToCents(text) === cents;
}

/**
 * Money amount typed as text (`12,50`) and reported in cents. An unparseable amount is
 * reported as `NaN` so validation can flag it.
 */
export function AmountInput({
  id,
  value,
  onChange,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: AmountInputProps) {
  const [text, setText] = useState(() => formatCentsAsAmount(value));

  // Resync when the value changes from outside (prefill, reset).
  if (!isInSync(text, value)) {
    setText(formatCentsAsAmount(value));
  }

  const isInvalid = value != null && Number.isNaN(value);

  return (
    <Input
      id={id}
      inputMode="decimal"
      autoComplete="off"
      value={text}
      aria-label={ariaLabel}
      aria-invalid={isInvalid || undefined}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseAmountToCents(e.target.value));
      }}
      className={cn("flex-1", className)}
    />
  );
}
