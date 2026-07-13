"use client";

import { AutocompleteCombobox } from "@/components/autocomplete-combobox";

interface ColumnFilterComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions: string[];
  className?: string;
  disabled?: boolean;
  debounceMs?: number;
  clearOptionLabel?: string;
}

export function ColumnFilterCombobox({
  debounceMs = 300,
  ...props
}: ColumnFilterComboboxProps) {
  return (
    <AutocompleteCombobox
      {...props}
      debounceMs={debounceMs}
      listClassName="font-normal"
    />
  );
}
