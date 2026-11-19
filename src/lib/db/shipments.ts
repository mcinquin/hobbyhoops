/** Incoming shipment queries and writes. */
import "server-only";

import { randomUUID } from "node:crypto";
import type { Shipment, ShipmentStatus } from "../types";
import { getDb } from "./connection";

function rowToShipment(row: Record<string, unknown>): Shipment {
  return {
    id: String(row.id),
    platform: String(row.platform) as Shipment["platform"],
    orderId: row.order_id == null ? null : String(row.order_id),
    seller: row.seller == null ? null : String(row.seller),
    description: String(row.description),
    priceCents: row.price_cents == null ? null : Number(row.price_cents),
    currency: String(row.currency || "EUR"),
    orderedAt: String(row.ordered_at),
    shippedAt: row.shipped_at == null ? null : String(row.shipped_at),
    trackingNumber:
      row.tracking_number == null ? null : String(row.tracking_number),
    carrier: row.carrier == null ? null : String(row.carrier),
    expectedDelivery:
      row.expected_delivery == null ? null : String(row.expected_delivery),
    status: String(row.status) as ShipmentStatus,
    cardId: row.card_id == null ? null : String(row.card_id),
    notes: String(row.notes ?? ""),
  };
}

const SHIPMENT_SELECT = `
  id, platform, order_id, seller, description, price_cents, currency,
  ordered_at, shipped_at, tracking_number, carrier, expected_delivery,
  status, card_id, notes
`.trim();

/** Shipments, newest order first; received ones are excluded unless `includeReceived`. */
export function readShipments(includeReceived = false): Shipment[] {
  const sql = includeReceived
    ? `SELECT ${SHIPMENT_SELECT} FROM shipments ORDER BY ordered_at DESC`
    : `SELECT ${SHIPMENT_SELECT} FROM shipments WHERE status != 'received' ORDER BY ordered_at DESC`;
  const rows = getDb().prepare(sql).all() as Record<string, unknown>[];
  return rows.map(rowToShipment);
}

/** A shipment by id, or null. */
export function readShipmentById(id: string): Shipment | null {
  const row = getDb()
    .prepare(`SELECT ${SHIPMENT_SELECT} FROM shipments WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToShipment(row) : null;
}

/**
 * Creates a shipment. Status defaults to `shipped` when a tracking number is given, else
 * `pending`.
 */
export function insertShipment(
  input: Omit<Shipment, "id" | "cardId" | "shippedAt" | "status"> & {
    status?: ShipmentStatus;
    shippedAt?: string | null;
  }
): Shipment {
  const db = getDb();
  const id = randomUUID();
  const status = input.status ?? (input.trackingNumber ? "shipped" : "pending");
  const shippedAt =
    input.shippedAt ??
    (input.trackingNumber && status !== "pending" ? input.orderedAt : null);

  db.prepare(
    `INSERT INTO shipments (
      id, platform, order_id, seller, description, price_cents, currency,
      ordered_at, shipped_at, tracking_number, carrier, expected_delivery,
      status, card_id, notes
    ) VALUES (
      @id, @platform, @order_id, @seller, @description, @price_cents, @currency,
      @ordered_at, @shipped_at, @tracking_number, @carrier, @expected_delivery,
      @status, NULL, @notes
    )`
  ).run({
    id,
    platform: input.platform,
    order_id: input.orderId,
    seller: input.seller,
    description: input.description.trim(),
    price_cents: input.priceCents,
    currency: input.currency.trim() || "EUR",
    ordered_at: input.orderedAt,
    shipped_at: shippedAt,
    tracking_number: input.trackingNumber,
    carrier: input.carrier,
    expected_delivery: input.expectedDelivery,
    status,
    notes: input.notes.trim(),
  });

  return readShipmentById(id)!;
}

/** Applies a partial update to a shipment and returns it, or null when the id does not exist. */
export function updateShipment(
  id: string,
  patch: Partial<
    Omit<Shipment, "id" | "cardId"> & { cardId?: string | null }
  >
): Shipment | null {
  const existing = readShipmentById(id);
  if (!existing) return null;

  const next: Shipment = {
    ...existing,
    ...patch,
    id: existing.id,
    description: patch.description?.trim() ?? existing.description,
    notes: patch.notes?.trim() ?? existing.notes,
    currency: patch.currency?.trim() || existing.currency,
  };

  if (
    patch.trackingNumber &&
    !patch.status &&
    existing.status === "pending"
  ) {
    next.status = "shipped";
    if (!next.shippedAt) {
      next.shippedAt = formatTodayIsoDateForDb();
    }
  }

  if (patch.status === "shipped" && !next.shippedAt) {
    next.shippedAt = formatTodayIsoDateForDb();
  }

  const result = getDb()
    .prepare(
      `UPDATE shipments SET
        platform = @platform,
        order_id = @order_id,
        seller = @seller,
        description = @description,
        price_cents = @price_cents,
        currency = @currency,
        ordered_at = @ordered_at,
        shipped_at = @shipped_at,
        tracking_number = @tracking_number,
        carrier = @carrier,
        expected_delivery = @expected_delivery,
        status = @status,
        card_id = @card_id,
        notes = @notes
      WHERE id = @id`
    )
    .run({
      id: next.id,
      platform: next.platform,
      order_id: next.orderId,
      seller: next.seller,
      description: next.description,
      price_cents: next.priceCents,
      currency: next.currency,
      ordered_at: next.orderedAt,
      shipped_at: next.shippedAt,
      tracking_number: next.trackingNumber,
      carrier: next.carrier,
      expected_delivery: next.expectedDelivery,
      status: next.status,
      card_id: next.cardId,
      notes: next.notes,
    });

  if (result.changes === 0) return null;
  return readShipmentById(id);
}

function formatTodayIsoDateForDb(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Deletes a shipment. Returns false when the id does not exist. */
export function deleteShipment(id: string): boolean {
  const result = getDb().prepare("DELETE FROM shipments WHERE id = ?").run(id);
  return result.changes > 0;
}
