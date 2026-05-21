"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

interface ServerTablePaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function ServerTablePagination({
  page,
  pageCount,
  onPageChange,
}: ServerTablePaginationProps) {
  const t = useTranslations();
  const canPrevious = page > 1;
  const canNext = page < pageCount;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t("common.pageOf", { page, total: pageCount })}
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
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("common.nextPage")}
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("common.lastPage")}
          onClick={() => onPageChange(pageCount)}
          disabled={!canNext}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
