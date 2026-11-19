import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { getRequestTranslator } from "@/i18n/request";
import { guardMutation, parseBody } from "@/lib/api-mutation";

function jsonRequest(body: string): NextRequest {
  return new NextRequest("https://example.com/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

const schema = z.object({ name: z.string().min(1) }).strict();

describe("parseBody", () => {
  it("returns typed data for a valid body", async () => {
    const request = jsonRequest(JSON.stringify({ name: "Wemby" }));
    const result = await parseBody(request, schema, getRequestTranslator(request));
    expect(result).toEqual({ ok: true, data: { name: "Wemby" } });
  });

  it("returns a 400 with the formatted Zod issue", async () => {
    const request = jsonRequest(JSON.stringify({ name: "" }));
    const result = await parseBody(request, schema, getRequestTranslator(request));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
    const payload = (await result.response.json()) as { error: string };
    expect(payload.error).toMatch(/^name: /);
  });

  it("uses the fixed error message when provided", async () => {
    const request = jsonRequest(JSON.stringify({ other: 1 }));
    const result = await parseBody(request, schema, getRequestTranslator(request), {
      errorMessage: "nope",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(await result.response.json()).toEqual({ error: "nope" });
  });

  it("applies prepare before validation", async () => {
    const request = jsonRequest(JSON.stringify({ name: "Wemby", extra: true }));
    const result = await parseBody(request, schema, getRequestTranslator(request), {
      prepare: (data) => ({ name: (data as { name: string }).name }),
    });
    expect(result).toEqual({ ok: true, data: { name: "Wemby" } });
  });

  it("rejects invalid JSON and oversized bodies", async () => {
    const invalid = jsonRequest("{nope");
    const invalidResult = await parseBody(invalid, schema, getRequestTranslator(invalid));
    expect(invalidResult.ok ? 200 : invalidResult.response.status).toBe(400);

    const big = jsonRequest(JSON.stringify({ name: "x".repeat(100) }));
    const bigResult = await parseBody(big, schema, getRequestTranslator(big), {
      maxBytes: 10,
    });
    expect(bigResult.ok ? 200 : bigResult.response.status).toBe(413);
  });
});

describe("guardMutation", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("rejects unauthenticated requests before any other check", () => {
    const result = guardMutation(jsonRequest("{}"), {
      scope: "test:write",
      limit: 1,
    });
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });
});
