import { describe, expect, it } from "vitest";
import {
  COLLECTION_HITS,
  hitCollectionHref,
  hitCollectionQuery,
} from "./collection-hits";
import { buildCollectionWhereClause, parseCollectionSearchParams } from "./collection-query";

const hit = (id: (typeof COLLECTION_HITS)[number]["id"]) =>
  COLLECTION_HITS.find((entry) => entry.id === id)!;

describe("hitCollectionHref", () => {
  it("opens the same filters as the counted query", () => {
    for (const entry of COLLECTION_HITS) {
      const parsed = parseCollectionSearchParams(
        new URL(hitCollectionHref(entry), "http://localhost").searchParams
      );
      expect(parsed).toEqual(hitCollectionQuery(entry));
    }
  });

  it("builds the expected URLs", () => {
    expect(hitCollectionHref(hit("rpa"))).toBe(
      "/collection?tag=rookie&tag=autograph&tag=memorabilia"
    );
    expect(hitCollectionHref(hit("oneOfOne"))).toBe("/collection?serialMin=1&serialMax=1");
    expect(hitCollectionHref(hit("upTo10"))).toBe("/collection?serialMin=2&serialMax=10");
  });
});

describe("hitCollectionQuery", () => {
  it("combines the flag filters with AND", () => {
    expect(buildCollectionWhereClause(hitCollectionQuery(hit("rcAuto"))).whereSql).toBe(
      "WHERE rookie = 1 AND autograph = 1"
    );
    expect(
      buildCollectionWhereClause(hitCollectionQuery(hit("numberedAuto"))).whereSql
    ).toBe("WHERE autograph = 1 AND serial_number IS NOT NULL AND serial_number != ''");
  });

  it("keeps 1/1 in their own hit, out of /10 or less", () => {
    const oneOfOne = buildCollectionWhereClause(hitCollectionQuery(hit("oneOfOne")));
    expect(oneOfOne.whereSql).toBe("WHERE serial_total >= ? AND serial_total <= ?");
    expect(oneOfOne.params).toEqual([1, 1]);
    const upTo10 = buildCollectionWhereClause(hitCollectionQuery(hit("upTo10")));
    expect(upTo10.params).toEqual([2, 10]);
  });
});
