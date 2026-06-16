import { API_FETCH_OPTS, parseApiErrorMessage } from "@/lib/api-fetch";
import type { Shipment, ShipmentStatus } from "@/lib/types";

export async function fetchShipments(includeReceived = false): Promise<Shipment[]> {
  const query = includeReceived ? "?includeReceived=1" : "";
  const res = await fetch(`/api/shipments${query}`, API_FETCH_OPTS);
  if (!res.ok) {
    throw new Error(
      await parseApiErrorMessage(res, "Failed to load shipments")
    );
  }
  return (await res.json()) as Shipment[];
}

export async function createShipment(body: {
  platform?: Shipment["platform"];
  orderId: string;
  seller?: string | null;
  description: string;
  priceCents?: number | null;
  currency?: string;
  orderedAt: string;
  trackingNumber: string;
  carrier?: string | null;
  expectedDelivery: string;
  notes?: string;
}): Promise<Shipment> {
  const res = await fetch("/api/shipments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...API_FETCH_OPTS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      await parseApiErrorMessage(res, "Failed to create shipment")
    );
  }
  const data = (await res.json()) as { shipment: Shipment };
  return data.shipment;
}

export async function updateShipment(body: {
  id: string;
  platform?: Shipment["platform"];
  orderId?: string | null;
  seller?: string | null;
  description?: string;
  priceCents?: number | null;
  currency?: string;
  orderedAt?: string;
  shippedAt?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  expectedDelivery?: string | null;
  status?: ShipmentStatus;
  cardId?: string | null;
  notes?: string;
}): Promise<Shipment> {
  const res = await fetch("/api/shipments", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    ...API_FETCH_OPTS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      await parseApiErrorMessage(res, "Failed to update shipment")
    );
  }
  const data = (await res.json()) as { shipment: Shipment };
  return data.shipment;
}

export async function deleteShipment(id: string): Promise<void> {
  const res = await fetch(`/api/shipments?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    ...API_FETCH_OPTS,
  });
  if (!res.ok) {
    throw new Error(
      await parseApiErrorMessage(res, "Failed to delete shipment")
    );
  }
}
