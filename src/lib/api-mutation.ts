import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { getRequestTranslator } from "@/i18n/request";
import type { Translator } from "@/i18n/translator";
import { rejectRateLimit } from "@/lib/api-rate-limit";
import { requireAuth } from "@/lib/auth-api";
import type { SessionPayload } from "@/lib/auth-session";
import { formatZodError } from "@/lib/card-schema";
import { parseJsonBody } from "@/lib/parse-json-body";
import { rejectCrossSiteMutation } from "@/lib/request-guard";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

export type MutationRateLimit = {
  /** Key prefix; the user id is appended (e.g. `cards:write` → `cards:write:<userId>`). */
  scope: string;
  limit: number;
  windowMs?: number;
};

export type MutationContext = {
  session: SessionPayload;
  t: Translator;
};

/**
 * Standard preamble for mutating API handlers: authentication, cross-site
 * (Fetch Metadata) check, then a per-user write rate limit.
 *
 * @returns the session and request translator, or the error response to return as-is.
 */
export function guardMutation(
  request: NextRequest,
  rateLimit: MutationRateLimit
): MutationContext | NextResponse {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;

  const rateLimited = rejectRateLimit(
    request,
    `${rateLimit.scope}:${session.userId}`,
    {
      limit: rateLimit.limit,
      windowMs: rateLimit.windowMs ?? DEFAULT_WINDOW_MS,
    }
  );
  if (rateLimited) return rateLimited;

  return { session, t: getRequestTranslator(request) };
}

type ParseBodyOptions = {
  /** Maximum accepted body size in bytes (defaults to `parseJsonBody`'s limit). */
  maxBytes?: number;
  /** Transforms the raw JSON before validation (e.g. normalising form input). */
  prepare?: (data: unknown) => unknown;
  /** Fixed 400 message instead of the formatted first Zod issue. */
  errorMessage?: string;
};

export type ParseBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * Reads the JSON body (size-capped) and validates it against `schema`.
 *
 * @returns the typed data, or a 400/413 response describing the problem.
 */
export async function parseBody<S extends z.ZodType>(
  request: NextRequest,
  schema: S,
  t: Translator,
  options: ParseBodyOptions = {}
): Promise<ParseBodyResult<z.output<S>>> {
  const body = await parseJsonBody(request, options.maxBytes);
  if (!body.ok) return body;

  const input = options.prepare ? options.prepare(body.data) : body.data;
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: options.errorMessage ?? formatZodError(parsed.error, t) },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
