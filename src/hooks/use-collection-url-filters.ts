"use client";

import { useCallback, useMemo, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { collectionQueryToSearchParams } from "@/lib/cards-client";
import {
  parseCollectionSearchParams,
  type CollectionListQuery,
  type CollectionSortKey,
  type CollectionTagValue,
} from "@/lib/collection-query";

export type { CollectionTagValue, CollectionSortKey };

export type CollectionFiltersState = Pick<
  CollectionListQuery,
  | "search"
  | "player"
  | "team"
  | "year"
  | "brand"
  | "set"
  | "variation"
  | "tags"
  | "page"
  | "sort"
  | "sortDesc"
>;

export type UseCollectionUrlFiltersOptions = {
  /** Taille de page fixe (ex. admin) — écrit `pageSize` dans l’URL. */
  fixedPageSize?: number;
};

export function useCollectionUrlFilters(
  options?: UseCollectionUrlFiltersOptions
) {
  const fixedPageSize = options?.fixedPageSize;
  const persistPageSize = fixedPageSize !== undefined;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();

  const filters = useMemo(() => {
    const parsed = parseCollectionSearchParams(searchParams);
    if (fixedPageSize !== undefined) {
      return { ...parsed, pageSize: fixedPageSize };
    }
    return parsed;
  }, [fixedPageSize, searchParams]);

  const syncToUrl = useCallback(
    (next: CollectionListQuery) => {
      const query =
        fixedPageSize !== undefined
          ? { ...next, pageSize: fixedPageSize }
          : next;
      const params = collectionQueryToSearchParams(query, { persistPageSize });
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, {
          scroll: false,
        });
      });
    },
    [fixedPageSize, pathname, persistPageSize, router, startTransition]
  );

  const updateFilters = useCallback(
    (
      patch: Partial<CollectionListQuery>,
      opts?: { immediate?: boolean; resetPage?: boolean }
    ) => {
      const shouldResetPage =
        opts?.resetPage ??
        (!("page" in patch) &&
          Object.keys(patch).some(
            (key) => key !== "page" && key !== "sort" && key !== "sortDesc"
          ));

      const next: CollectionListQuery = {
        ...filters,
        ...patch,
        page: shouldResetPage ? 1 : (patch.page ?? filters.page),
        ...(fixedPageSize !== undefined ? { pageSize: fixedPageSize } : {}),
      };

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (opts?.immediate) {
        syncToUrl(next);
      } else {
        debounceRef.current = setTimeout(() => syncToUrl(next), 300);
      }
    },
    [filters, fixedPageSize, syncToUrl]
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

  const toggleTag = useCallback(
    (tag: CollectionTagValue) => {
      const next = filters.tags.includes(tag)
        ? filters.tags.filter((value) => value !== tag)
        : [...filters.tags, tag];
      updateFilters({ tags: next, page: 1 }, { immediate: true });
    },
    [filters.tags, updateFilters]
  );

  return { filters, updateFilters, toggleSort, toggleTag, isPending };
}
