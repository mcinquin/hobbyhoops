"use client";

import { useState } from "react";
import { References } from "@/lib/types";
import { parseSingleColumnValues } from "@/lib/csv-parse";
import { patchReferences } from "@/lib/references-client";
import { BatchTextImport } from "@/components/admin/batch-text-import";
import { FilterableListBrowser } from "@/components/filterable-list-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { useTranslations } from "@/i18n/client";

interface AdminPlayersSectionProps {
  references: References;
  onReferencesChange: (references: References) => void;
}

export function AdminPlayersSection({
  references,
  onReferencesChange,
}: AdminPlayersSectionProps) {
  const t = useTranslations();
  const [player, setPlayer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAddPlayer() {
    const name = player.trim();
    if (!name) {
      setError(t("admin.players.nameRequired"));
      setSuccess(null);
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      onReferencesChange(await patchReferences({ action: "addPlayer", player: name }));
      setPlayer("");
      setSuccess(t("admin.players.added"));
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : t("errors.updateFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("admin.players.intro")}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <Label htmlFor="admin-player-name">{t("admin.players.unitAdd")}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="admin-player-name"
              value={player}
              onChange={(e) => setPlayer(e.target.value)}
              placeholder={t("admin.players.placeholder")}
              disabled={loading}
            />
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={loading}
              onClick={() => void handleAddPlayer()}
            >
              {t("common.add")}
            </Button>
          </div>
          <AdminFeedback
            success={success}
            error={error}
            onSuccessDismiss={() => setSuccess(null)}
          />
        </div>

        <BatchTextImport
          label={t("admin.players.batchImport")}
          description={t("admin.players.batchDescSpreadsheet")}
          placeholder={t("admin.players.batchPlaceholder")}
          disabled={loading}
          onSubmit={async (text) => {
            const players = parseSingleColumnValues(text);
            onReferencesChange(
              await patchReferences({ action: "addPlayers", players })
            );
          }}
        />
      </div>

      <FilterableListBrowser
        items={references.players}
        filterPlaceholder={t("admin.players.filter")}
        countLabel={t("admin.players.referenced", {
          count: references.players.length,
        })}
        filteredCountLabel={(count) => t("admin.players.shown", { count })}
        emptyLabel={t("admin.players.noneFound")}
        className="max-w-none border-0 p-0"
      />
    </div>
  );
}
