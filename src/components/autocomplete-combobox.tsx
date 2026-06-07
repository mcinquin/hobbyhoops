"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AutocompleteComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions: string[];
  className?: string;
  disabled?: boolean;
  required?: boolean;
  /** Debounce des changements (filtres colonnes). */
  debounceMs?: number;
  /** N’affiche les suggestions que lorsque la liste est ouverte (formulaires). */
  suggestionsOnlyWhenOpen?: boolean;
  /** Première option pour effacer la valeur (champs optionnels). */
  clearOptionLabel?: string;
  listClassName?: string;
}

export function AutocompleteCombobox({
  id,
  value,
  onChange,
  placeholder,
  suggestions,
  className,
  disabled,
  required,
  debounceMs,
  suggestionsOnlyWhenOpen = false,
  clearOptionLabel,
  listClassName,
}: AutocompleteComboboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listboxId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const isDebounced = debounceMs !== undefined && debounceMs > 0;
  const [inputText, setInputText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [sentValue, setSentValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (isDebounced && prevValue !== value) {
    setPrevValue(value);
    if (sentValue !== value) {
      setInputText(value);
    }
  }

  const displayValue = isDebounced ? inputText : value;
  const query = displayValue.trim().toLowerCase();
  const visibleSuggestions = useMemo(() => {
    if (suggestionsOnlyWhenOpen && !open) return [];
    return suggestions.filter((suggestion) =>
      suggestion.toLowerCase().includes(query)
    );
  }, [open, query, suggestions, suggestionsOnlyWhenOpen]);

  const listOptions = useMemo(() => {
    const options: { label: string; value: string }[] = [];
    if (clearOptionLabel) {
      options.push({ label: clearOptionLabel, value: "" });
    }
    for (const suggestion of visibleSuggestions) {
      options.push({ label: suggestion, value: suggestion });
    }
    return options;
  }, [clearOptionLabel, visibleSuggestions]);

  function commitValue(nextValue: string): void {
    if (isDebounced) {
      setInputText(nextValue);
      setSentValue(nextValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onChange(nextValue);
    } else {
      onChange(nextValue);
    }
    setOpen(false);
    setActiveIndex(0);
  }

  function handleInputChange(newText: string): void {
    if (isDebounced) {
      setInputText(newText);
      setOpen(true);
      setActiveIndex(0);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSentValue(newText);
        onChange(newText);
      }, debounceMs);
      return;
    }
    onChange(newText);
    setOpen(true);
    setActiveIndex(0);
  }

  return (
    <div className="relative">
      <Input
        id={inputId}
        value={displayValue}
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
          if (listOptions.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % listOptions.length);
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(
              (index) => (index - 1 + listOptions.length) % listOptions.length
            );
          }
          if (event.key === "Enter" && open) {
            event.preventDefault();
            commitValue(listOptions[activeIndex]?.value ?? "");
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        role="combobox"
        aria-expanded={open && listOptions.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        className={className}
      />
      {open && listOptions.length > 0 && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 text-xs shadow-lg",
            listClassName
          )}
        >
          {listOptions.map((option, index) => (
            <button
              key={option.value || "__empty__"}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                "block w-full rounded px-2 py-1.5 text-left hover:bg-accent aria-selected:bg-accent",
                option.value === "" && "text-muted-foreground"
              )}
              onMouseDown={(event) => {
                event.preventDefault();
                commitValue(option.value);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
