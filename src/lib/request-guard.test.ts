import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { rejectCrossSiteMutation } from "@/lib/request-guard";

describe("rejectCrossSiteMutation", () => {
  it("rejects cross-site origin", () => {
    const result = rejectCrossSiteMutation(
      new NextRequest("https://example.com/api/cards", {
        method: "POST",
        headers: {
          Origin: "https://evil.example",
          "Sec-Fetch-Site": "cross-site",
        },
      })
    );
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it("allows same-origin requests", () => {
    const result = rejectCrossSiteMutation(
      new NextRequest("https://example.com/api/cards", {
        method: "POST",
        headers: {
          Origin: "https://example.com",
          "Sec-Fetch-Site": "same-origin",
        },
      })
    );
    expect(result).toBeNull();
  });

  it("requires fetch metadata when configured", () => {
    const result = rejectCrossSiteMutation(
      new NextRequest("https://example.com/api/cards", { method: "POST" }),
      { requireFetchMetadata: true }
    );
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });
});
