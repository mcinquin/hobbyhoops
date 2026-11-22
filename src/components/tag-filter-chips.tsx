"use client";

import {
  COLLECTION_TAG_VALUES,
  type CollectionTagValue,
} from "@/lib/collection-query";
import type { CardBadgeLabels } from "@/components/card-badges";
import { FilterChipButton } from "@/components/filter-chip-button";
import { cn } from "@/lib/utils";

interface TagFilterChipsProps {
  selected: readonly CollectionTagValue[];
  labels: CardBadgeLabels;
  onToggle: (tag: CollectionTagValue) => void;
  className?: string;
}

/** Row of toggle chips for the cumulative (AND) tag filters. */
export function TagFilterChips({
  selected,
  labels,
  onToggle,
  className,
}: TagFilterChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {COLLECTION_TAG_VALUES.map((tag) => (
        <FilterChipButton
          key={tag}
          label={labels[tag]}
          pressed={selected.includes(tag)}
          onPressedChange={() => onToggle(tag)}
        />
      ))}
    </div>
  );
}
