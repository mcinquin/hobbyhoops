"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, References } from "@/lib/types";
import { AdminCardsSection } from "@/components/admin/admin-cards-section";
import { AdminPlayersSection } from "@/components/admin/admin-players-section";
import { AdminCatalogSection } from "@/components/admin/admin-catalog-section";
import { AdminClubsSection } from "@/components/admin/admin-clubs-section";
import { AdminYearsSection } from "@/components/admin/admin-years-section";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "@/i18n/client";

export default function AdminPage() {
  const t = useTranslations();
  const [cards, setCards] = useState<Card[]>([]);
  const [references, setReferences] = useState<References | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs = useMemo(
    () => [
      { value: "cards", label: t("admin.tabs.cards") },
      { value: "players", label: t("admin.tabs.players") },
      { value: "catalog", label: t("admin.tabs.catalog") },
      { value: "clubs", label: t("admin.tabs.clubs") },
      { value: "years", label: t("admin.tabs.years") },
    ],
    [t]
  );

  const fetchAdminData = useCallback(async () => {
    const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };
    const [cardsRes, refsRes] = await Promise.all([
      fetch("/api/cards", fetchOpts),
      fetch("/api/references", fetchOpts),
    ]);
    if (cardsRes.status === 401 || refsRes.status === 401) {
      window.location.href = "/login";
      return null;
    }
    if (!cardsRes.ok || !refsRes.ok) {
      throw new Error(t("admin.loadFailed"));
    }
    return {
      cards: (await cardsRes.json()) as Card[],
      references: (await refsRes.json()) as References,
    };
  }, [t]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminData();
      if (!data) return;
      setCards(data.cards);
      setReferences(data.references);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.loadError"));
    } finally {
      setLoading(false);
    }
  }, [fetchAdminData, t]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await fetchAdminData();
        if (cancelled || !data) return;
        setCards(data.cards);
        setReferences(data.references);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("admin.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchAdminData, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !references) {
    return (
      <div className="space-y-4 py-20 text-center">
        <p className="text-sm text-destructive">
          {error ?? t("admin.unavailable")}
        </p>
        <Button variant="outline" size="sm" onClick={() => void loadData()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-bold tracking-tight">
            {t("admin.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {t("admin.subtitle", { count: cards.length })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => void loadData()}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          {t("admin.reload")}
        </Button>
      </div>

      <Tabs defaultValue="cards">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="cards" className="pt-6">
          <AdminCardsSection
            cards={cards}
            references={references}
            onCardsChange={setCards}
            onReferencesChange={setReferences}
          />
        </TabsContent>

        <TabsContent value="players" className="pt-6">
          <AdminPlayersSection
            references={references}
            onReferencesChange={setReferences}
          />
        </TabsContent>

        <TabsContent value="catalog" className="pt-6">
          <AdminCatalogSection
            references={references}
            onReferencesChange={setReferences}
          />
        </TabsContent>

        <TabsContent value="clubs" className="pt-6">
          <AdminClubsSection
            references={references}
            onReferencesChange={setReferences}
          />
        </TabsContent>

        <TabsContent value="years" className="pt-6">
          <AdminYearsSection
            references={references}
            onReferencesChange={setReferences}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
