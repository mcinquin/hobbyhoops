import type { Metadata, Viewport } from "next";
import { LocaleProvider } from "@/i18n/client";
import { getTranslations } from "@/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    appleWebApp: {
      capable: true,
      title: t("meta.title"),
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await getTranslations();

  return (
    <html lang={locale} className="dark h-full antialiased">
      <body className="min-h-screen w-full">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
