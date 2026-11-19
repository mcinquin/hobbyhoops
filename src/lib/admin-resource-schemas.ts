import { z } from "zod";
import type { AdminCardSightStatus } from "@/lib/card-recognition/types";
import type { SiteInfo } from "@/lib/site-info-types";
import type { DuplicateCardGroup } from "@/lib/types";

/** Response of `GET /api/admin/site-info`. */
export const siteInfoSchema: z.ZodType<SiteInfo> = z.object({
  generatedAt: z.string(),
  app: z.object({
    version: z.string(),
    nodeVersion: z.string(),
    nodeEnv: z.string(),
    platform: z.string(),
    uptimeSeconds: z.number(),
  }),
  runtime: z.object({
    trustProxy: z.boolean(),
    cookieSecure: z.boolean(),
  }),
  database: z.object({
    displayPath: z.string(),
    sizeBytes: z.number(),
    journalMode: z.string(),
    pageCount: z.number(),
    pageSize: z.number(),
    foreignKeys: z.boolean(),
    schemaVersion: z.number(),
    expectedSchemaVersion: z.number(),
    schemaUpToDate: z.boolean(),
    healthOk: z.boolean(),
  }),
  auth: z.object({
    users: z.number(),
    activeSessions: z.number(),
  }),
});

/** Response of `GET /api/admin/cardsight`. */
export const cardSightStatusSchema: z.ZodType<AdminCardSightStatus> = z.object({
  configured: z.boolean(),
  monthlyQuota: z.number(),
  usage: z
    .object({
      totalCalls: z.number(),
      keyMasked: z.string().nullable(),
      keyCalls: z.number().nullable(),
      remaining: z.number(),
    })
    .nullable(),
  errorCode: z.enum(["auth", "quota", "network"]).nullable(),
});

/**
 * Response of `GET /api/admin/duplicates`. Group metadata is validated; the
 * card list items are only checked to be objects (they mirror `CardListItem`).
 */
export const duplicateGroupsSchema = z.object({
  groups: z.array(
    z.object({
      player: z.string(),
      year: z.string().nullable(),
      brand: z.string(),
      set: z.string(),
      variation: z.string(),
      cardNumber: z.string(),
      serialNumber: z.string(),
      cards: z.array(
        z.custom<DuplicateCardGroup["cards"][number]>(
          (value) => typeof value === "object" && value !== null && "id" in value
        )
      ),
    })
  ),
});

/** Response of `GET /api/auth/sessions`. */
export const sessionsListSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string(),
      createdAt: z.number(),
      lastSeenAt: z.number(),
      expiresAt: z.number(),
      device: z.string(),
      current: z.boolean(),
    })
  ),
});

export type SessionEntry = z.infer<typeof sessionsListSchema>["sessions"][number];
