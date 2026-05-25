"use client";

import type { Table } from "@tanstack/react-table";
import { PaginationControls } from "@/components/data-table/pagination-controls";

interface TablePaginationProps<T> {
  table: Table<T>;
}

export function TablePagination<T>({ table }: TablePaginationProps<T>) {
  const page = table.getState().pagination.pageIndex + 1;
  const pageCount = Math.max(1, table.getPageCount());

  return (
    <PaginationControls
      page={page}
      pageCount={pageCount}
      onPageChange={(nextPage) => table.setPageIndex(nextPage - 1)}
    />
  );
}
