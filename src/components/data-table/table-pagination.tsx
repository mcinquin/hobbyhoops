"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

interface TablePaginationProps<T> {
  table: Table<T>;
}

export function TablePagination<T>({ table }: TablePaginationProps<T>) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t("common.pageOf", {
          page: table.getState().pagination.pageIndex + 1,
          total: table.getPageCount(),
        })}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          aria-label={t("common.firstPage")}
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("common.previousPage")}
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("common.nextPage")}
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("common.lastPage")}
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
