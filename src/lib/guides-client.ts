import type { FrNbaPlayer, WantedBlock } from "@/lib/types";

const FETCH_OPTS = {
  credentials: "include" as const,
  cache: "no-store" as const,
};

async function parseJsonError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : "";
}

export async function createWantedEntry(body: {
  set: string;
  variation: string;
  player: string;
  slot: number | null;
}): Promise<WantedBlock[]> {
  const res = await fetch("/api/wanted", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...FETCH_OPTS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error((await parseJsonError(res)) || "Failed to create wanted entry");
  }
  const data = (await res.json()) as { blocks: WantedBlock[] };
  return data.blocks;
}

export async function deleteWantedEntry(id: number): Promise<WantedBlock[]> {
  const res = await fetch(`/api/wanted?id=${id}`, {
    method: "DELETE",
    ...FETCH_OPTS,
  });
  if (!res.ok) {
    throw new Error((await parseJsonError(res)) || "Failed to delete wanted entry");
  }
  const data = (await res.json()) as { blocks: WantedBlock[] };
  return data.blocks;
}

export async function saveFrNbaPlayer(
  body: Partial<FrNbaPlayer> & { id?: number }
): Promise<FrNbaPlayer> {
  const isEdit = body.id !== undefined;
  const res = await fetch("/api/fr-nba", {
    method: isEdit ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    ...FETCH_OPTS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error((await parseJsonError(res)) || "Failed to save player");
  }
  return (await res.json()) as FrNbaPlayer;
}
