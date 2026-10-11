import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { rejectReadRateLimit } from "@/lib/api-read-rate-limit";
import {
  cardSightMonthlyQuota,
  fetchCardSightUsage,
  isCardRecognitionConfigured,
} from "@/lib/card-recognition/cardsight";
import { RecognitionError } from "@/lib/card-recognition/errors";
import type { AdminCardSightStatus } from "@/lib/card-recognition/types";

export const dynamic = "force-dynamic";

/** GET — état du compte CardSight (clé masquée, usage du mois, quota restant). */
export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;

  const rateLimited = rejectReadRateLimit(
    request,
    `admin-cardsight:${gate.userId}`,
    { limit: 30, windowMs: 60 * 60 * 1000 }
  );
  if (rateLimited) return rateLimited;

  const monthlyQuota = cardSightMonthlyQuota();
  if (!isCardRecognitionConfigured()) {
    const status: AdminCardSightStatus = {
      configured: false,
      monthlyQuota,
      usage: null,
      errorCode: null,
    };
    return NextResponse.json(status);
  }

  try {
    const usage = await fetchCardSightUsage();
    const status: AdminCardSightStatus = {
      configured: true,
      monthlyQuota,
      usage: {
        ...usage,
        remaining: Math.max(0, monthlyQuota - usage.totalCalls),
      },
      errorCode: null,
    };
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof RecognitionError) {
      const status: AdminCardSightStatus = {
        configured: true,
        monthlyQuota,
        usage: null,
        errorCode:
          error.code === "auth"
            ? "auth"
            : error.code === "quota"
              ? "quota"
              : "network",
      };
      return NextResponse.json(status);
    }
    throw error;
  }
}
