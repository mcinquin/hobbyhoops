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
  // -1 = aucune proposition surlignée : Entrée valide le texte saisi.
  const [activeIndex, setActiveIndex] = useState(-1);

  const isDebounced = debounceMs !== undefined && debounceMs > 0;
  // Le texte affiché est toujours piloté localement pendant la saisie.
  const [inputText, setInputText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Dernière valeur que CE composant a émise, pour distinguer nos propres
  // mises à jour (URL / parent) d'un vrai changement externe.
  const [lastSent, setLastSent] = useState(value);

  // Ne synchronise le champ depuis la valeur externe que si le changement
  // ne provient pas de notre propre onChange (reset programmatique, effacement
  // depuis l'extérieur…). Ne jamais écraser la saisie en cours de correction.
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== lastSent) {
      setInputText(value);
      setLastSent(value);
    }
  }

  const query = inputText.trim().toLowerCase();
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

  function emit(nextValue: string): void {
    setLastSent(nextValue);
    onChange(nextValue);
  }

  /** Valide une valeur (clic sur une proposition, ou touche Entrée). */
  function commitValue(nextValue: string): void {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInputText(nextValue);
    setOpen(false);
    setActiveIndex(-1);
    emit(nextValue);
  }

  function handleInputChange(newText: string): void {
    setInputText(newText);
    setOpen(true);
    // Toute frappe annule la sélection clavier : c'est le texte qui prime.
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!isDebounced) {
      emit(newText);
      return;
    }

    // En mode debounce, on applique immédiatement un effacement pour garder
    // les filtres synchronisés, sinon on temporise.
    if (newText.trim() === "") {
      emit("");
      return;
    }
    debounceRef.current = setTimeout(() => emit(newText), debounceMs);
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
            setActiveIndex(-1);
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            // Une proposition n'est prise que si elle a été surlignée
            // explicitement au clavier ; sinon on recherche le texte saisi.
            if (open && activeIndex >= 0 && listOptions[activeIndex]) {
              commitValue(listOptions[activeIndex].value);
            } else {
              commitValue(inputText);
            }
            return;
          }
          if (listOptions.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) =>
              index < 0 ? 0 : (index + 1) % listOptions.length
            );
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) =>
              index <= 0 ? listOptions.length - 1 : index - 1
            );
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
