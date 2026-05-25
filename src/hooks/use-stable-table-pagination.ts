"use client";

import { useState } from "react";
import type { OnChangeFn, PaginationState } from "@tanstack/react-table";

interface UseStableTablePaginationOptions {
  pageSize: number;
  /** Quand cette clé change (recherche / filtres), la page revient à 0. */
  resetKey: string;
  rowCount: number;
}

type StablePaginationState = {
  pageIndex: number;
  pageSize: number;
  resetKey: string;
};

export function useStableTablePagination({
  pageSize,
  resetKey,
  rowCount,
}: UseStableTablePaginationOptions) {
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize));
  const maxIndex = Math.max(0, pageCount - 1);

  const [state, setState] = useState<StablePaginationState>({
    pageIndex: 0,
    pageSize,
    resetKey,
  });

  // Ajustement pendant le rendu (pattern getDerivedStateFromProps) — pas d'effet.
  if (state.resetKey !== resetKey) {
    setState({ pageIndex: 0, pageSize, resetKey });
  } else if (state.pageIndex > maxIndex) {
    setState({ pageIndex: maxIndex, pageSize, resetKey });
  } else if (state.pageSize !== pageSize) {
    setState({ ...state, pageSize });
  }

  const pagination: PaginationState = {
    pageIndex: state.pageIndex,
    pageSize: state.pageSize,
  };

  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    setState((prev) => {
      const current: PaginationState = {
        pageIndex: prev.pageIndex,
        pageSize: prev.pageSize,
      };
      const next =
        typeof updater === "function" ? updater(current) : updater;
      const nextMaxIndex = Math.max(0, pageCount - 1);
      return {
        pageIndex: Math.min(Math.max(0, next.pageIndex), nextMaxIndex),
        pageSize: next.pageSize,
        resetKey: prev.resetKey,
      };
    });
  };

  return {
    pagination,
    onPaginationChange,
    autoResetPageIndex: false as const,
  };
}
