"use client";

import {
  formatOpeningDateForInput,
  parseOpeningDateInput,
} from "@/lib/opening-date";
import { LocaleDateInput } from "@/components/locale-date-input";

interface OpeningDateInputProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function OpeningDateInput(props: OpeningDateInputProps) {
  return (
    <LocaleDateInput
      {...props}
      formatForInput={formatOpeningDateForInput}
      parseInput={parseOpeningDateInput}
    />
  );
}
