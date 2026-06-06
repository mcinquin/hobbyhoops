import { NextRequest, NextResponse } from "next/server";
import {
  createShipment,
  editShipment,
  getShipments,
  removeShipment,
} from "@/lib/data";
import { requireAuth } from "@/lib/auth-api";
import {
  formatZodError,
  shipmentCreateSchema,
  shipmentUpdateSchema,
} from "@/lib/shipment-schema";
import { getRequestTranslator } from "@/i18n/request";
import { parseJsonBody } from "@/lib/parse-json-body";
import { rejectCrossSiteMutation } from "@/lib/request-guard";
import { rejectWriteRateLimit } from "@/lib/api-write-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;

  const includeReceived =
    new URL(request.url).searchParams.get("includeReceived") === "1";

  return NextResponse.json(getShipments(includeReceived));
}

export async function POST(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const rateLimited = rejectWriteRateLimit(
    request,
    `shipments:write:${gate.userId}`,
    {
      limit: 60,
      windowMs: 15 * 60 * 1000,
    }
  );
  if (rateLimited) return rateLimited;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = shipmentCreateSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error, t) },
      { status: 400 }
    );
  }

  const shipment = createShipment(parsed.data);
  return NextResponse.json({ shipment }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const rateLimited = rejectWriteRateLimit(
    request,
    `shipments:write:${gate.userId}`,
    {
      limit: 60,
      windowMs: 15 * 60 * 1000,
    }
  );
  if (rateLimited) return rateLimited;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = shipmentUpdateSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error, t) },
      { status: 400 }
    );
  }

  const { id, ...patch } = parsed.data;
  const shipment = editShipment(id, patch);
  if (!shipment) {
    return NextResponse.json(
      { error: t("errors.shipmentNotFound") },
      { status: 404 }
    );
  }

  return NextResponse.json({ shipment });
}

export async function DELETE(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const rateLimited = rejectWriteRateLimit(
    request,
    `shipments:write:${gate.userId}`,
    {
      limit: 60,
      windowMs: 15 * 60 * 1000,
    }
  );
  if (rateLimited) return rateLimited;

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json(
      { error: t("errors.shipmentIdMissing") },
      { status: 400 }
    );
  }

  if (!removeShipment(id)) {
    return NextResponse.json(
      { error: t("errors.shipmentNotFound") },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
