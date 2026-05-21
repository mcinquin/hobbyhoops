"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTranslations } from "@/i18n/client";

interface AppShellProps {
  username: string | null;
  children: React.ReactNode;
}

export function AppShell({ username, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex shrink-0">
        <Sidebar username={username} />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:min-w-0">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
        >
          {t("nav.skipToContent")}
        </a>
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t("nav.openMenu")}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-sm font-semibold">
              <span className="text-amber-500">Hobby</span>Hoops
            </p>
            {username && (
              <p className="text-xs text-muted-foreground truncate">{username}</p>
            )}
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6 md:px-6 md:py-8 max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">{t("nav.sheetTitle")}</SheetTitle>
          <Sidebar
            username={username}
            onNavigate={() => setMobileOpen(false)}
            className="h-full border-r-0"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
