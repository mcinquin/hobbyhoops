import { getAuthSecret } from "@/lib/auth-secret";
import { getLogger } from "@/lib/logger";

const dbLogger = getLogger("db");

export async function register(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  try {
    getAuthSecret();
    const { getDb } = await import("@/lib/db");
    getDb();
  } catch (error) {
    dbLogger.error({ msg: "Startup aborted", err: error });
    process.exit(1);
  }
}
