"use client";

import { AutocompleteCombobox } from "@/components/autocomplete-combobox";

interface CatalogComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions: string[];
  disabled?: boolean;
}

export function CatalogCombobox(props: CatalogComboboxProps) {
  return <AutocompleteCombobox {...props} />;
}
