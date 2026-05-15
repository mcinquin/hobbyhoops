import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { SESSION_COOKIE_NAME } from "@/lib/auth-secret";
import { verifySessionToken } from "@/lib/auth-session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  return <AppShell username={session?.username ?? null}>{children}</AppShell>;
}
