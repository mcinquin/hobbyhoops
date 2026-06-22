import type { Metadata, Viewport } from "next";
import { getTranslations } from "@/i18n/server";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    appleWebApp: {
      capable: true,
      title: t("meta.title"),
      statusBarStyle: "black-translucent",
    },
    icons: {
      apple: "/icons/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await getTranslations();

  return (
    <html lang={locale} className="dark h-full antialiased">
      <body className="min-h-screen w-full" suppressHydrationWarning>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
