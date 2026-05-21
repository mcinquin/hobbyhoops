"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface ColumnFilterComboboxProps {
  /** The currently applied filter value (from URL / parent state). */
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions: string[];
  className?: string;
  disabled?: boolean;
  /** Debounce delay in ms for free-text changes. Defaults to 300. */
  debounceMs?: number;
}

export function ColumnFilterCombobox({
  value,
  onChange,
  placeholder,
  suggestions,
  className,
  disabled,
  debounceMs = 300,
}: ColumnFilterComboboxProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Local input text — decoupled from the URL-derived `value` prop so that
  // every keystroke only re-renders this component, not the full CardTable.
  //
  // External URL changes (e.g. "reset filters" navigation) are synced via the
  // getDerivedStateFromProps pattern: calling setState during render is React's
  // official approach for deriving state from props without using effects.
  // `sentValue` prevents re-syncing our own URL updates back to the input.
  const [inputText, setInputText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [sentValue, setSentValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // getDerivedStateFromProps: sync input when the URL filter changes externally.
  if (prevValue !== value) {
    setPrevValue(value);
    if (sentValue !== value) {
      setInputText(value);
    }
  }

  const query = inputText.trim().toLowerCase();
  const visibleSuggestions = useMemo(
    () =>
      suggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(query)
      ),
    [query, suggestions]
  );

  function selectSuggestion(nextValue: string): void {
    setInputText(nextValue);
    setSentValue(nextValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange(nextValue);
    setOpen(false);
    setActiveIndex(0);
  }

  function handleInputChange(newText: string): void {
    setInputText(newText);
    setOpen(true);
    setActiveIndex(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSentValue(newText);
      onChange(newText);
    }, debounceMs);
  }

  return (
    <div className="relative">
      <Input
        id={inputId}
        value={inputText}
        onChange={(event) => handleInputChange(event.target.value)}
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
        className={className}
      />
      {open && visibleSuggestions.length > 0 && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 text-xs font-normal shadow-lg"
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
