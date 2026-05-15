import type { Metadata } from "next";
import { connection } from "next/server";
import { LocaleProvider } from "@/i18n/client";
import { getTranslations } from "@/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  const { locale } = await getTranslations();

  return (
    <html lang={locale} className="dark h-full antialiased">
      <body className="min-h-screen w-full">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
