import { NextResponse } from "next/server";
import { getUsers } from "@/lib/users-store";

export async function GET() {
  return NextResponse.json({ needsBootstrap: getUsers().length === 0 });
}
