"use client";

import { useMemo, useState } from "react";
import { References } from "@/lib/types";
import { parseSingleColumnValues } from "@/lib/csv-parse";
import { patchReferences } from "@/lib/references-client";
import { BatchTextImport } from "@/components/admin/batch-text-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { Search } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return references.players;
    const q = search.toLowerCase();
    return references.players.filter((name) => name.toLowerCase().includes(q));
  }, [references.players, search]);

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

      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.players.filter")}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {t("admin.players.referenced", { count: references.players.length })}
          {search ? ` ${t("admin.players.shown", { count: filtered.length })}` : ""}
        </p>
        <div className="max-h-72 overflow-auto rounded-lg border border-border p-3 text-sm">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground">{t("admin.players.noneFound")}</p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
