"use client";

import type { ReactTable, RowData } from "@tanstack/react-table";
import { PaginationControls } from "@/components/data-table/pagination-controls";
import type { InteractiveTableFeatures } from "@/components/data-table/table-features";

interface TablePaginationProps<TData extends RowData> {
  table: ReactTable<InteractiveTableFeatures, TData>;
}

export function TablePagination<TData extends RowData>({
  table,
}: TablePaginationProps<TData>) {
  const page = table.state.pagination.pageIndex + 1;
  const pageCount = Math.max(1, table.getPageCount());

  return (
    <PaginationControls
      page={page}
      pageCount={pageCount}
      onPageChange={(nextPage) => table.setPageIndex(nextPage - 1)}
    />
  );
}
