"use client";

import { useRef, useState } from "react";
import { SearchField } from "@/components/search-field";

/**
 * Champ de recherche collection/admin : état local + debounce 300 ms,
 * puis sync URL via le callback parent (`immediate: true` recommandé).
 */
export function CollectionSearchInput({
  urlValue,
  onSearch,
  label,
  placeholder,
  className,
}: {
  urlValue: string;
  onSearch: (value: string) => void;
  label: string;
  placeholder: string;
  className?: string;
}) {
  const [inputValue, setInputValue] = useState(urlValue);
  const [prevUrlValue, setPrevUrlValue] = useState(urlValue);
  const [sentValue, setSentValue] = useState(urlValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (prevUrlValue !== urlValue) {
    setPrevUrlValue(urlValue);
    if (sentValue !== urlValue) {
      setInputValue(urlValue);
    }
  }

  function handleChange(newValue: string) {
    setInputValue(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSentValue(newValue);
      onSearch(newValue);
    }, 300);
  }

  return (
    <SearchField
      value={inputValue}
      onChange={handleChange}
      label={label}
      placeholder={placeholder}
      className={className}
    />
  );
}
