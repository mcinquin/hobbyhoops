import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { readCardPhotoFile } from "@/lib/card-photo-storage";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ cardId: string; filename: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;

  const { cardId, filename } = await context.params;
  const decodedId = decodeURIComponent(cardId);
  const decodedName = decodeURIComponent(filename);

  const file = readCardPhotoFile(decodedId, decodedName);
  if (!file.ok) {
    return new NextResponse(null, { status: 404 });
  }

  const etag = `"${Math.trunc(file.mtimeMs)}-${file.buffer.length}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304 });
  }

  return new NextResponse(new Uint8Array(file.buffer), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.buffer.length),
      "Cache-Control": "private, max-age=86400",
      ETag: etag,
    },
  });
}
