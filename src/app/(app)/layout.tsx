import { cookies } from "next/headers";
import { LocaleProvider } from "@/i18n/client";
import { AppShell } from "@/components/app-shell";
import { getTranslations } from "@/i18n/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-secret";
import { verifySessionToken } from "@/lib/auth-session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await getTranslations();
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  return (
    <LocaleProvider locale={locale}>
      <AppShell username={session?.username ?? null}>{children}</AppShell>
    </LocaleProvider>
  );
}
