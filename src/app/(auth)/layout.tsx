import { LocaleProvider } from "@/i18n/client";
import { getTranslations } from "@/i18n/server";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await getTranslations();
  return <LocaleProvider locale={locale}>{children}</LocaleProvider>;
}
