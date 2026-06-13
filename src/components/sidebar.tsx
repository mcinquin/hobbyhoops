"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Library,
  Users,
  Settings,
  UserCircle,
  LogOut,
  ListChecks,
  Flag,
  Package,
} from "lucide-react";
import { APP_VERSION } from "@/lib/app-version";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandMark } from "@/components/brand-mark";

interface SidebarProps {
  username: string | null;
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ username, onNavigate, className }: SidebarProps) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const t = useTranslations();

  const navItems = useMemo(
    () => [
      { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
      { href: "/collection", label: t("nav.collection"), icon: Library },
      { href: "/wanted", label: t("nav.wanted"), icon: ListChecks },
      { href: "/shipments", label: t("nav.shipments"), icon: Package },
      { href: "/fr-nba", label: t("nav.frNba"), icon: Flag },
      { href: "/player", label: t("nav.players"), icon: Users },
      { href: "/admin", label: t("nav.admin"), icon: Settings },
      { href: "/account", label: t("nav.account"), icon: UserCircle },
    ],
    [t]
  );

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/";
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside
      className={cn(
        "w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0",
        className
      )}
    >
      <div className="p-6 border-b border-border">
        <BrandMark
          logoHeight={52}
          className="w-full"
          homeAriaLabel={t("brand.homeAria")}
          priority
        />
        <p className="text-xs text-muted-foreground mt-3 leading-snug text-center">
          {t("brand.tagline")}
        </p>
        {username && (
          <p
            className="text-xs text-amber-500/90 mt-2 font-medium truncate text-center"
            title={username}
          >
            {username}
          </p>
        )}
      </div>

      <nav
        className="flex-1 p-4 space-y-1"
        aria-label={t("nav.aria")}
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <LanguageSwitcher />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          disabled={loggingOut}
          onClick={() => void logout()}
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? t("nav.logoutPending") : t("nav.logout")}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          HobbyHoops v{APP_VERSION}
        </p>
      </div>
    </aside>
  );
}
