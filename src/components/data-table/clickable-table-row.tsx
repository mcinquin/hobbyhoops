"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ClickableTableRowProps {
  onActivate: () => void;
  children: ReactNode;
  className?: string;
}

export function ClickableTableRow({
  onActivate,
  children,
  className,
}: ClickableTableRowProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  }

  return (
    <TableRow
      tabIndex={0}
      role="button"
      className={cn(
        "cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
    >
      {children}
    </TableRow>
  );
}
