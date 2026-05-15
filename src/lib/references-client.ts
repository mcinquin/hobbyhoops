import { References } from "@/lib/types";

export async function patchReferences(body: Record<string, unknown>): Promise<References> {
  const res = await fetch("/api/references", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "");
  }
  return data as References;
}
