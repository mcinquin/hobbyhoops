import { describe, expect, it } from "vitest";
import {
  buildCollectionWhereClause,
  columnFilterPatch,
  formatSerialRangeLabel,
  parseCollectionSearchParams,
} from "@/lib/collection-query";

describe("parseCollectionSearchParams", () => {
  it("parses pagination and filters", () => {
    const params = new URLSearchParams({
      page: "2",
      pageSize: "25",
      q: "prizm",
      player: "James",
      sort: "year",
      sortDir: "desc",
      tag: "rookie",
    });
    const query = parseCollectionSearchParams(params);
    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(25);
    expect(query.search).toBe("prizm");
    expect(query.player).toBe("James");
    expect(query.sort).toBe("year");
    expect(query.sortDesc).toBe(true);
    expect(query.tags).toEqual(["rookie"]);
  });

  it("caps page size and defaults invalid page", () => {
    const params = new URLSearchParams({
      page: "0",
      pageSize: "500",
    });
    const query = parseCollectionSearchParams(params);
    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(100);
  });

  it("builds FTS5 clause for global search", () => {
    const { whereSql, params } = buildCollectionWhereClause({
      search: "lebron prizm",
      player: "",
      team: "",
      year: "",
      brand: "",
      set: "",
      variation: "",
      tags: [],
      serialMin: null,
      serialMax: null,
      serialPosition: "",
      page: 1,
      pageSize: 50,
      sort: "player",
      sortDesc: false,
    });
    expect(whereSql).toContain("cards_fts MATCH ?");
    expect(params).toEqual(['"lebron"* AND "prizm"*']);
  });

  it("matches brand, set and variation exactly (no substring overlap)", () => {
    const { whereSql, params } = buildCollectionWhereClause({
      search: "",
      player: "",
      team: "",
      year: "",
      brand: "Donruss",
      set: "Donruss",
      variation: "",
      tags: [],
      serialMin: null,
      serialMax: null,
      serialPosition: "",
      page: 1,
      pageSize: 50,
      sort: "player",
      sortDesc: false,
    });
    expect(whereSql).toContain("LOWER(brand) = ?");
    expect(whereSql).toContain("LOWER(set_name) = ?");
    expect(whereSql).not.toContain("LIKE");
    expect(params).toContain("donruss");
  });
});

describe("withBrandScopedFilters", () => {
  it("drops set and variation without a brand", () => {
    const query = parseCollectionSearchParams(
      new URLSearchParams("set=Prizm&variation=Silver")
    );
    expect(query.set).toBe("");
    expect(query.variation).toBe("");
  });

  it("keeps set and variation when a brand is present", () => {
    const query = parseCollectionSearchParams(
      new URLSearchParams("brand=Panini&set=Prizm&variation=Silver")
    );
    expect(query).toMatchObject({ brand: "Panini", set: "Prizm", variation: "Silver" });
  });
});

describe("columnFilterPatch", () => {
  it("resets set and variation when the brand changes", () => {
    expect(columnFilterPatch("brand", "Panini")).toEqual({
      brand: "Panini",
      set: "",
      variation: "",
    });
  });

  it("keeps the variation when a set is chosen", () => {
    expect(columnFilterPatch("set", "Prizm")).toEqual({ set: "Prizm" });
  });

  it("resets the variation when the set is cleared", () => {
    expect(columnFilterPatch("set", "  ")).toEqual({ set: "", variation: "" });
  });

  it("patches other columns alone", () => {
    expect(columnFilterPatch("player", "LeBron")).toEqual({ player: "LeBron" });
    expect(columnFilterPatch("variation", "")).toEqual({ variation: "" });
  });
});

describe("print-run filters", () => {
  const base = parseCollectionSearchParams(new URLSearchParams());

  it("parses serial bounds and position", () => {
    const query = parseCollectionSearchParams(
      new URLSearchParams({ serialMin: "2", serialMax: "10", serialPosition: "first" })
    );
    expect(query.serialMin).toBe(2);
    expect(query.serialMax).toBe(10);
    expect(query.serialPosition).toBe("first");
  });

  it("ignores invalid values", () => {
    const query = parseCollectionSearchParams(
      new URLSearchParams({ serialMin: "0", serialMax: "abc", serialPosition: "middle" })
    );
    expect(query.serialMin).toBeNull();
    expect(query.serialMax).toBeNull();
    expect(query.serialPosition).toBe("");
    expect(base.serialMin).toBeNull();
    expect(base.serialPosition).toBe("");
  });

  it("filters on serial_total bounds", () => {
    const { whereSql, params } = buildCollectionWhereClause({
      ...base,
      serialMin: 11,
      serialMax: 25,
    });
    expect(whereSql).toBe("WHERE serial_total >= ? AND serial_total <= ?");
    expect(params).toEqual([11, 25]);
  });

  it("filters on the first or last serial of a run, 1/1 excluded", () => {
    expect(
      buildCollectionWhereClause({ ...base, serialPosition: "first" }).whereSql
    ).toBe("WHERE serial_current = 1 AND serial_total > 1");
    expect(
      buildCollectionWhereClause({ ...base, serialPosition: "last" }).whereSql
    ).toBe("WHERE serial_current = serial_total AND serial_total > 1");
  });
});

describe("formatSerialRangeLabel", () => {
  it("labels print-run ranges", () => {
    expect(formatSerialRangeLabel(null, null)).toBeNull();
    expect(formatSerialRangeLabel(1, 1)).toBe("1/1");
    expect(formatSerialRangeLabel(2, 10)).toBe("/2–/10");
    expect(formatSerialRangeLabel(99, 99)).toBe("/99");
    expect(formatSerialRangeLabel(null, 99)).toBe("≤ /99");
    expect(formatSerialRangeLabel(200, null)).toBe("≥ /200");
  });
});
