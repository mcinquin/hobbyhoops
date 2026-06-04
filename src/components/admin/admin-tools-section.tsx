"use client";

import { useCallback, useEffect, useState } from "react";
import type { DuplicateCardGroup } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CardBadges } from "@/components/card-badges";
import { useCardBadgeLabels } from "@/hooks/use-card-badge-labels";
import { useTranslations } from "@/i18n/client";
import { Download, Loader2, RefreshCw } from "lucide-react";

export function AdminToolsSection() {
  const t = useTranslations();
  const badgeLabels = useCardBadgeLabels();
  const [groups, setGroups] = useState<DuplicateCardGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);

  const loadDuplicates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/duplicates", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("load");
      const data = (await response.json()) as { groups: DuplicateCardGroup[] };
      setGroups(data.groups);
    } catch {
      setError(t("admin.tools.duplicatesLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/duplicates", { credentials: "include" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) throw new Error("load");
        const data = (await response.json()) as {
          groups: DuplicateCardGroup[];
        };
        setGroups(data.groups);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError(t("admin.tools.duplicatesLoadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  async function downloadBackup() {
    setBackingUp(true);
    setBackupError(null);
    try {
      const response = await fetch("/api/admin/backup", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("backup");

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `hobbyhoops-${new Date().toISOString().slice(0, 10)}.db`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setBackupError(t("admin.tools.backupError"));
    } finally {
      setBackingUp(false);
    }
  }

  const duplicateCount = groups.reduce((sum, group) => sum + group.cards.length, 0);

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-card p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-medium">{t("admin.tools.backupTitle")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("admin.tools.backupDesc")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={backingUp}
          onClick={() => void downloadBackup()}
        >
          {backingUp ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {backingUp ? t("admin.tools.backupPending") : t("admin.tools.backupAction")}
        </Button>
        {backupError ? (
          <p className="text-sm text-destructive">{backupError}</p>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">{t("admin.tools.duplicatesTitle")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("admin.tools.duplicatesDesc")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void loadDuplicates()}
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            {t("common.retry")}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("admin.tools.duplicatesNone")}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t("admin.tools.duplicatesSummary", {
                groups: groups.length,
                cards: duplicateCount,
              })}
            </p>
            <div className="space-y-4">
              {groups.map((group) => (
                <div
                  key={`${group.player}-${group.year}-${group.set}-${group.variation}-${group.cardNumber}-${group.serialNumber}`}
                  className="rounded-lg border border-border bg-card p-4 space-y-3"
                >
                  <div>
                    <p className="font-medium">{group.player}</p>
                    <p className="text-sm text-muted-foreground">
                      {[
                        group.year,
                        group.brand,
                        group.set,
                        group.variation,
                        group.cardNumber
                          ? t("admin.tools.duplicatesCardNum", {
                              number: group.cardNumber,
                            })
                          : null,
                        group.serialNumber
                          ? t("admin.tools.duplicatesSerial", {
                              serial: group.serialNumber,
                            })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {group.cards.map((card) => (
                      <li
                        key={card.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-muted-foreground">
                            {card.id}
                          </p>
                          <p className="text-sm">
                            {card.grading || "—"}
                            {card.storage
                              ? ` · ${card.storage}`
                              : ""}
                            {card.openingDate
                              ? ` · ${card.openingDate}`
                              : ""}
                          </p>
                        </div>
                        <CardBadges card={card} labels={badgeLabels} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
