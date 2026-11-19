import "server-only";

import { getAuthSecret } from "@/lib/auth-secret";

/** Startup check: fails fast in production when `AUTH_SECRET` is invalid. */
export async function register(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  getAuthSecret();
}
