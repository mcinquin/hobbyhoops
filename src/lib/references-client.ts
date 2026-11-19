import { API_FETCH_OPTS, parseApiErrorMessage } from "@/lib/api-fetch";
import { References } from "@/lib/types";

/** Client: loads the references catalogue. */
export async function fetchReferences(): Promise<References> {
  const res = await fetch("/api/references", API_FETCH_OPTS);
  if (!res.ok) {
    throw new Error(
      await parseApiErrorMessage(res, "Failed to load references")
    );
  }
  return (await res.json()) as References;
}

/** Client: applies a references PATCH action and returns the updated catalogue. */
export async function patchReferences(
  body: Record<string, unknown>
): Promise<References> {
  const res = await fetch("/api/references", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    ...API_FETCH_OPTS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res, ""));
  }
  return (await res.json()) as References;
}
