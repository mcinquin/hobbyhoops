"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, References } from "@/lib/types";
import { AdminCardsSection } from "@/components/admin/admin-cards-section";
import { AdminPlayersSection } from "@/components/admin/admin-players-section";
import { AdminCatalogSection } from "@/components/admin/admin-catalog-section";
import { AdminClubsSection } from "@/components/admin/admin-clubs-section";
import { AdminYearsSection } from "@/components/admin/admin-years-section";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface AdminWorkspaceProps {
  initialCards: Card[];
  initialReferences: References;
}

export function AdminWorkspace({
  initialCards,
  initialReferences,
}: AdminWorkspaceProps) {
  const t = useTranslations();
  const [cards, setCards] = useState(initialCards);
  const [references, setReferences] = useState(initialReferences);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("cards");

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
    } catch {
      setError(t("admin.loadError"));
    } finally {
      setLoading(false);
    }
  }, [fetchAdminData, t]);

  if (error) {
    return (
      <div className="space-y-4 py-20 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void loadData()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title={t("admin.title")}
        subtitle={t("admin.subtitle", { count: cards.length })}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={loading}
            onClick={() => void loadData()}
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            {t("admin.reload")}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <select
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm md:hidden"
          aria-label={t("admin.tabs.aria")}
        >
          {tabs.map((tab) => (
            <option key={tab.value} value={tab.value}>
              {tab.label}
            </option>
          ))}
        </select>

        <TabsList className="hidden !h-auto w-full max-w-full justify-start p-1 md:inline-flex">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-8 flex-none px-3 text-xs sm:text-sm"
            >
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
