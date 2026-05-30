import { describe, expect, it } from "vitest";
import { buildFtsMatchQuery } from "@/lib/card-search-fts";

describe("buildFtsMatchQuery", () => {
  it("returns null for empty search", () => {
    expect(buildFtsMatchQuery("")).toBeNull();
    expect(buildFtsMatchQuery("   ")).toBeNull();
  });

  it("builds a single-token prefix query", () => {
    expect(buildFtsMatchQuery("prizm")).toBe('"prizm"*');
  });

  it("builds an AND query for multiple tokens", () => {
    expect(buildFtsMatchQuery("lebron prizm")).toBe('"lebron"* AND "prizm"*');
  });

  it("normalizes casing and collapses whitespace", () => {
    expect(buildFtsMatchQuery("  LeBron   Prizm  ")).toBe(
      '"lebron"* AND "prizm"*'
    );
  });

  it("strips FTS syntax characters from tokens", () => {
    expect(buildFtsMatchQuery('foo"bar*')).toBe('"foobar"*');
  });
});
