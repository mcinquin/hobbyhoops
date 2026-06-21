import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { buildPublicRequestUrl, getPublicOrigin } from "@/lib/request-url";

describe("getPublicOrigin", () => {
  afterEach(() => {
    delete process.env.TRUST_PROXY;
  });

  it("prefers forwarded host over Docker bind address", () => {
    process.env.TRUST_PROXY = "true";
    const request = new NextRequest("http://0.0.0.0:3000/api/auth/logout", {
      headers: {
        host: "0.0.0.0:3000",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "hobbyhoops.example",
      },
    });

    expect(getPublicOrigin(request)).toBe("https://hobbyhoops.example");
    expect(buildPublicRequestUrl(request, "/").toString()).toBe(
      "https://hobbyhoops.example/"
    );
  });

  it("falls back to Host when forwarded host is absent", () => {
    process.env.TRUST_PROXY = "true";
    const request = new NextRequest("http://0.0.0.0:3000/", {
      headers: {
        host: "cards.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(getPublicOrigin(request)).toBe("https://cards.example.com");
  });
});
