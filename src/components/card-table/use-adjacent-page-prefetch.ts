"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  COLLECTION_PAGE_SIZE,
  type CollectionListQuery,
} from "@/lib/collection-query";
import { collectionQueryToSearchParams } from "@/lib/cards-client";

/** Prefetches the previous and next collection pages so pagination feels instant. */
export function useAdjacentPagePrefetch(
  filters: CollectionListQuery,
  pageCount: number
) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const targets: number[] = [];
    if (filters.page > 1) targets.push(filters.page - 1);
    if (filters.page < pageCount) targets.push(filters.page + 1);

    for (const page of targets) {
      const params = collectionQueryToSearchParams(
        { ...filters, page },
        { persistPageSize: filters.pageSize !== COLLECTION_PAGE_SIZE }
      );
      const qs = params.toString();
      router.prefetch(qs ? `${pathname}?${qs}` : pathname);
    }
  }, [filters, pageCount, pathname, router]);
}
