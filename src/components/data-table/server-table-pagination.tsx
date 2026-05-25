"use client";

import { PaginationControls } from "@/components/data-table/pagination-controls";

interface ServerTablePaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function ServerTablePagination(props: ServerTablePaginationProps) {
  return <PaginationControls {...props} />;
}
