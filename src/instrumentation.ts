import { getAuthSecret } from "@/lib/auth-secret";

export async function register(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  try {
    getAuthSecret();
    const { getDb } = await import("@/lib/db");
    getDb();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[hobbyhoops:db:migrate] Startup aborted: ${detail}`);
    process.exit(1);
  }
}
