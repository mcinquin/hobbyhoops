"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterableListBrowserProps {
  items: string[];
  selectedItem?: string;
  onSelect?: (item: string) => void;
  filterPlaceholder: string;
  countLabel: string;
  filteredCountLabel?: (filteredCount: number) => string;
  emptyLabel: string;
  title?: string;
  className?: string;
}

export function FilterableListBrowser({
  items,
  selectedItem,
  onSelect,
  filterPlaceholder,
  countLabel,
  filteredCountLabel,
  emptyLabel,
  title,
  className,
}: FilterableListBrowserProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className={cn("space-y-3 rounded-lg border border-border p-4", className)}>
      {title ? <h3 className="text-sm font-medium">{title}</h3> : null}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={filterPlaceholder}
          className="pl-9"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {countLabel}
        {search && filteredCountLabel
          ? ` ${filteredCountLabel(filtered.length)}`
          : ""}
      </p>
      <div className="max-h-56 overflow-auto rounded-lg border border-border p-3 text-sm">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="grid gap-1 sm:grid-cols-2">
            {filtered.map((item) => (
              <li key={item}>
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className={cn(
                      "w-full rounded px-2 py-1.5 text-left transition-colors hover:bg-accent",
                      selectedItem === item &&
                        "bg-accent font-medium text-accent-foreground"
                    )}
                  >
                    {item}
                  </button>
                ) : (
                  <span className="block rounded px-2 py-1.5">{item}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
