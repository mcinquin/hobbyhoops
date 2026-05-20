"use client";

import { useId, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

interface CatalogComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions: string[];
  disabled?: boolean;
}

export function CatalogCombobox({
  value,
  onChange,
  placeholder,
  suggestions,
  disabled,
}: CatalogComboboxProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const query = value.trim().toLowerCase();
  const visibleSuggestions = useMemo(
    () =>
      suggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(query)
      ),
    [query, suggestions]
  );

  function selectSuggestion(nextValue: string): void {
    onChange(nextValue);
    setOpen(false);
    setActiveIndex(0);
  }

  return (
    <div className="relative">
      <Input
        id={inputId}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
            setOpen(true);
            return;
          }
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (visibleSuggestions.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % visibleSuggestions.length);
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(
              (index) =>
                (index - 1 + visibleSuggestions.length) %
                visibleSuggestions.length
            );
          }
          if (event.key === "Enter" && open) {
            event.preventDefault();
            selectSuggestion(visibleSuggestions[activeIndex]);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-expanded={open && visibleSuggestions.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
      />
      {open && visibleSuggestions.length > 0 && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 text-xs shadow-lg"
        >
          {visibleSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className="block w-full rounded px-2 py-1.5 text-left hover:bg-accent aria-selected:bg-accent"
              onMouseDown={(event) => {
                event.preventDefault();
                selectSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
