"use client";

import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

interface PaginationControlsProps {
  /** Page courante (1-indexée). */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Remplace le libellé « Page X sur Y » par défaut. */
  summary?: ReactNode;
}

export function PaginationControls({
  page,
  pageCount,
  onPageChange,
  summary,
}: PaginationControlsProps) {
  const t = useTranslations();
  const safePageCount = Math.max(1, pageCount);
  const safePage = Math.min(Math.max(1, page), safePageCount);
  const canPrevious = safePage > 1;
  const canNext = safePage < safePageCount;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {summary ??
          t("common.pageOf", { page: safePage, total: safePageCount })}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          aria-label={t("common.firstPage")}
          onClick={() => onPageChange(1)}
          disabled={!canPrevious}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("common.previousPage")}
          onClick={() => onPageChange(safePage - 1)}
          disabled={!canPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("common.nextPage")}
          onClick={() => onPageChange(safePage + 1)}
          disabled={!canNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("common.lastPage")}
          onClick={() => onPageChange(safePageCount)}
          disabled={!canNext}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
