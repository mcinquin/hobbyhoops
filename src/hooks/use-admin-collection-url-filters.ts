"use client";

import { useCallback, useMemo, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ADMIN_CARDS_PAGE_SIZE,
  parseCollectionSearchParams,
  type CollectionListQuery,
  type CollectionSortKey,
} from "@/lib/collection-query";

export function useAdminCollectionUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();

  const filters = useMemo(() => {
    const parsed = parseCollectionSearchParams(searchParams);
    return { ...parsed, pageSize: ADMIN_CARDS_PAGE_SIZE };
  }, [searchParams]);

  const syncToUrl = useCallback(
    (next: CollectionListQuery) => {
      const params = new URLSearchParams();
      if (next.search) params.set("q", next.search);
      if (next.player) params.set("player", next.player);
      if (next.team) params.set("team", next.team);
      if (next.year) params.set("year", next.year);
      if (next.brand) params.set("brand", next.brand);
      if (next.set) params.set("set", next.set);
      if (next.variation) params.set("variation", next.variation);
      for (const tag of next.tags) {
        params.append("tag", tag);
      }
      if (next.page > 1) params.set("page", String(next.page));
      params.set("pageSize", String(ADMIN_CARDS_PAGE_SIZE));
      if (next.sort !== "player") params.set("sort", next.sort);
      if (next.sortDesc) params.set("sortDir", "desc");

      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, startTransition]
  );

  const updateFilters = useCallback(
    (
      patch: Partial<CollectionListQuery>,
      options?: { immediate?: boolean; resetPage?: boolean }
    ) => {
      const shouldResetPage =
        options?.resetPage ??
        (!("page" in patch) &&
          Object.keys(patch).some(
            (key) => key !== "page" && key !== "sort" && key !== "sortDesc"
          ));

      const next: CollectionListQuery = {
        ...filters,
        ...patch,
        pageSize: ADMIN_CARDS_PAGE_SIZE,
        page: shouldResetPage ? 1 : (patch.page ?? filters.page),
      };

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (options?.immediate) {
        syncToUrl(next);
      } else {
        debounceRef.current = setTimeout(() => syncToUrl(next), 300);
      }
    },
    [filters, syncToUrl]
  );

  const toggleSort = useCallback(
    (column: CollectionSortKey) => {
      const sortDesc = filters.sort === column ? !filters.sortDesc : false;
      updateFilters(
        { sort: column, sortDesc, page: 1 },
        { immediate: true, resetPage: false }
      );
    },
    [filters.sort, filters.sortDesc, updateFilters]
  );

  return { filters, updateFilters, toggleSort, isPending };
}
