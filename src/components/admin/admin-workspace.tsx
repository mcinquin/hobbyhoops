"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useCallback } from "react";
import { References } from "@/lib/types";
import { fetchAdminSnapshot } from "@/lib/cards-client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { AdminTabLoading } from "@/components/admin/admin-tab-loading";

const adminTabLoading = () => <AdminTabLoading />;

const AdminCardsSection = dynamic(
  () =>
    import("@/components/admin/admin-cards-section").then(
      (mod) => mod.AdminCardsSection
    ),
  { loading: adminTabLoading }
);

const AdminPlayersSection = dynamic(
  () =>
    import("@/components/admin/admin-players-section").then(
      (mod) => mod.AdminPlayersSection
    ),
  { loading: adminTabLoading }
);

const AdminCatalogSection = dynamic(
  () =>
    import("@/components/admin/admin-catalog-section").then(
      (mod) => mod.AdminCatalogSection
    ),
  { loading: adminTabLoading }
);

const AdminClubsSection = dynamic(
  () =>
    import("@/components/admin/admin-clubs-section").then(
      (mod) => mod.AdminClubsSection
    ),
  { loading: adminTabLoading }
);

const AdminYearsSection = dynamic(
  () =>
    import("@/components/admin/admin-years-section").then(
      (mod) => mod.AdminYearsSection
    ),
  { loading: adminTabLoading }
);

const AdminCsvSection = dynamic(
  () =>
    import("@/components/admin/admin-csv-section").then(
      (mod) => mod.AdminCsvSection
    ),
  { loading: adminTabLoading }
);

interface AdminWorkspaceProps {
  initialReferences: References;
  totalCardCount: number;
}

export function AdminWorkspace({
  initialReferences,
  totalCardCount,
}: AdminWorkspaceProps) {
  const t = useTranslations();
  const [references, setReferences] = useState(initialReferences);
  const [totalCount, setTotalCount] = useState(totalCardCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("cards");
  const [cardsReloadToken, setCardsReloadToken] = useState(0);

  const handleCsvImported = useCallback(async () => {
    try {
      const data = await fetchAdminSnapshot();
      setReferences(data.references);
      setTotalCount(data.totalCount);
      setCardsReloadToken((token) => token + 1);
    } catch {
      setError(t("admin.loadError"));
    }
  }, [t]);

  const tabs = useMemo(
    () => [
      { value: "cards", label: t("admin.tabs.cards") },
      { value: "players", label: t("admin.tabs.players") },
      { value: "catalog", label: t("admin.tabs.catalog") },
      { value: "clubs", label: t("admin.tabs.clubs") },
      { value: "years", label: t("admin.tabs.years") },
      { value: "csv", label: t("admin.tabs.csv") },
    ],
    [t]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminSnapshot();
      setReferences(data.references);
      setTotalCount(data.totalCount);
      setCardsReloadToken((token) => token + 1);
    } catch {
      setError(t("admin.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
        subtitle={t("admin.subtitle", { count: totalCount })}
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
          {activeTab === "cards" ? (
            <AdminCardsSection
              references={references}
              onReferencesChange={setReferences}
              onTotalCountChange={setTotalCount}
              reloadToken={cardsReloadToken}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="players" className="pt-6">
          {activeTab === "players" ? (
            <AdminPlayersSection
              references={references}
              onReferencesChange={setReferences}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="catalog" className="pt-6">
          {activeTab === "catalog" ? (
            <AdminCatalogSection
              references={references}
              onReferencesChange={setReferences}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="clubs" className="pt-6">
          {activeTab === "clubs" ? (
            <AdminClubsSection
              references={references}
              onReferencesChange={setReferences}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="years" className="pt-6">
          {activeTab === "years" ? (
            <AdminYearsSection
              references={references}
              onReferencesChange={setReferences}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="csv" className="pt-6">
          {activeTab === "csv" ? (
            <AdminCsvSection
              references={references}
              onImported={() => void handleCsvImported()}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
