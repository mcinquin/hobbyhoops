"use client";

import { formatIsoDateForInput, parseDateInputToIso } from "@/lib/locale-date";
import { LocaleDateInput } from "@/components/locale-date-input";

interface IsoDateInputProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

/** `LocaleDateInput` storing ISO `YYYY-MM-DD` values. */
export function IsoDateInput(props: IsoDateInputProps) {
  return (
    <LocaleDateInput
      {...props}
      formatForInput={formatIsoDateForInput}
      parseInput={parseDateInputToIso}
    />
  );
}
