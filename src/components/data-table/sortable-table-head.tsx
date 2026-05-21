"use client";

import { flexRender, type Header } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps<T> {
  header?: Header<T, unknown>;
  label?: React.ReactNode;
  className?: string;
  sortKey?: string;
  sorted?: false | "asc" | "desc";
  onSortToggle?: () => void;
}

export function SortableTableHead<T>({
  header,
  label,
  className,
  sortKey,
  sorted = false,
  onSortToggle,
}: SortableTableHeadProps<T>) {
  const canSort = Boolean(onSortToggle ?? header?.column.getCanSort());
  const content =
    label ??
    (header
      ? flexRender(header.column.columnDef.header, header.getContext())
      : null);

  if (!canSort) {
    return (
      <TableHead className={cn("whitespace-nowrap", className)}>{content}</TableHead>
    );
  }

  const ariaSort =
    sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none";

  return (
    <TableHead
      className={cn("whitespace-nowrap", className)}
      aria-sort={ariaSort}
      data-sort-key={sortKey}
    >
      <button
        type="button"
        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left font-medium hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onSortToggle ?? header?.column.getToggleSortingHandler()}
      >
        {content}
        <ArrowUpDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </TableHead>
  );
}
