"use client";

import { useState } from "react";

type ClampedPageState = {
  page: number;
  resetKey: string;
};

/** Pagination 0-indexée qui se réinitialise via resetKey et se borne quand le nombre de pages diminue. */
export function useClampedPage(pageCount: number, resetKey: string) {
  const maxPage = Math.max(0, pageCount - 1);

  const [state, setState] = useState<ClampedPageState>({
    page: 0,
    resetKey,
  });

  // Ajustement pendant le rendu (pattern getDerivedStateFromProps) — pas d'effet.
  if (state.resetKey !== resetKey) {
    setState({ page: 0, resetKey });
  } else if (state.page > maxPage) {
    setState({ page: maxPage, resetKey });
  }

  const setPage = (page: number) => {
    setState((prev) => ({
      ...prev,
      page: Math.min(Math.max(0, page), maxPage),
    }));
  };

  return [state.page, setPage] as const;
}
