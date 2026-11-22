"use client";

import type { ComponentProps } from "react";
import { AutocompleteCombobox } from "@/components/autocomplete-combobox";

/** Autocomplete combobox with the card form's sizing and list defaults. */
export function FormCombobox(props: ComponentProps<typeof AutocompleteCombobox>) {
  return (
    <AutocompleteCombobox
      suggestionsOnlyWhenOpen
      className="w-full"
      listClassName="z-50 max-h-64 min-w-full text-sm"
      {...props}
    />
  );
}
