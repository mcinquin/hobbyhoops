import { NextRequest, NextResponse } from "next/server";
import {
  createShipment,
  editShipment,
  getShipments,
  readShipment,
  removeShipment,
} from "@/lib/data";
import { requireAuth } from "@/lib/auth-api";
import { auditLog, auditShipmentUpdateFields } from "@/lib/audit-log";
import {
  shipmentCreateSchema,
  shipmentUpdateSchema,
} from "@/lib/shipment-schema";
import { guardMutation, parseBody } from "@/lib/api-mutation";

export const dynamic = "force-dynamic";

const SHIPMENTS_WRITE_LIMIT = { scope: "shipments:write", limit: 60 };

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;

  const includeReceived =
    new URL(request.url).searchParams.get("includeReceived") === "1";

  return NextResponse.json(getShipments(includeReceived));
}

export async function POST(request: NextRequest) {
  const guard = guardMutation(request, SHIPMENTS_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const parsed = await parseBody(request, shipmentCreateSchema, t);
  if (!parsed.ok) return parsed.response;

  const shipment = createShipment(parsed.data);
  auditLog("shipment.create", {
    user: session.username,
    id: shipment.id,
    platform: shipment.platform,
    status: shipment.status,
    description: shipment.description,
  });
  return NextResponse.json({ shipment }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const guard = guardMutation(request, SHIPMENTS_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const parsed = await parseBody(request, shipmentUpdateSchema, t);
  if (!parsed.ok) return parsed.response;

  const { id, ...patch } = parsed.data;
  const shipment = editShipment(id, patch);
  if (!shipment) {
    return NextResponse.json(
      { error: t("errors.shipmentNotFound") },
      { status: 404 }
    );
  }

  auditLog("shipment.update", {
    user: session.username,
    id: shipment.id,
    ...auditShipmentUpdateFields(patch),
  });

  return NextResponse.json({ shipment });
}

export async function DELETE(request: NextRequest) {
  const guard = guardMutation(request, SHIPMENTS_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json(
      { error: t("errors.shipmentIdMissing") },
      { status: 400 }
    );
  }

  const existing = readShipment(id);
  if (!existing) {
    return NextResponse.json(
      { error: t("errors.shipmentNotFound") },
      { status: 404 }
    );
  }

  if (!removeShipment(id)) {
    return NextResponse.json(
      { error: t("errors.shipmentNotFound") },
      { status: 404 }
    );
  }

  auditLog("shipment.delete", {
    user: session.username,
    id: existing.id,
    platform: existing.platform,
    description: existing.description,
  });

  return NextResponse.json({ success: true });
}
