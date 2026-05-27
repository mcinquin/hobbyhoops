import { getAuthSecret } from "@/lib/auth-secret";

export async function register(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    getAuthSecret();
  }
}
