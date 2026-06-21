import { cookies } from "next/headers";
import { AccountForm } from "@/components/account-form";
import { AccountSessionsSection } from "@/components/account-sessions-section";
import { SESSION_COOKIE_NAME } from "@/lib/auth-secret";
import { verifySessionToken } from "@/lib/auth-session";

export default async function AccountPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  return (
    <div className="space-y-8">
      <AccountForm initialUsername={session?.username ?? ""} />
      <AccountSessionsSection />
    </div>
  );
}
