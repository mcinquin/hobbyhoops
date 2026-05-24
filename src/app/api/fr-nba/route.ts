import { NextRequest, NextResponse } from "next/server";
import {
  createFrNbaPlayer,
  editFrNbaPlayer,
  getFrNbaPlayers,
} from "@/lib/data";
import { requireAuth } from "@/lib/auth-api";
import {
  formatZodError,
  frNbaUpdateSchema,
  frNbaWriteSchema,
} from "@/lib/guide-schema";
import { getRequestTranslator } from "@/i18n/request";
import { parseJsonBody } from "@/lib/parse-json-body";
import { rejectCrossSiteMutation } from "@/lib/request-guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json(getFrNbaPlayers());
}

export async function POST(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = frNbaWriteSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error, t) },
      { status: 400 }
    );
  }

  const player = createFrNbaPlayer(parsed.data);
  return NextResponse.json(player, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = frNbaUpdateSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error, t) },
      { status: 400 }
    );
  }

  const { id, ...body } = parsed.data;
  const updated = editFrNbaPlayer(id, body);
  if (!updated) {
    return NextResponse.json(
      { error: t("errors.frNbaNotFound") },
      { status: 404 }
    );
  }

  return NextResponse.json(updated);
}
