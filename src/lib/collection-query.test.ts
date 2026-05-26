import { describe, expect, it } from "vitest";
import { parseCollectionSearchParams } from "@/lib/collection-query";

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
});
