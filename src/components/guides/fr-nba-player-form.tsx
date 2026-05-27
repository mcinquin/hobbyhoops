"use client";

import { useState } from "react";
import { saveFrNbaPlayer } from "@/lib/guides-client";
import type { FrNbaPlayer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/i18n/client";

const EMPTY_FORM: Omit<FrNbaPlayer, "id"> = {
  player: "",
  draftYear: "",
  draftedBy: "",
  rookieCard: null,
  auto: null,
  patch: null,
  immaculate: null,
};

function initialForm(player: FrNbaPlayer | null): Omit<FrNbaPlayer, "id"> {
  if (!player) return EMPTY_FORM;
  return {
    player: player.player,
    draftYear: player.draftYear,
    draftedBy: player.draftedBy,
    rookieCard: player.rookieCard,
    auto: player.auto,
    patch: player.patch,
    immaculate: player.immaculate,
  };
}

function parseOptionalBool(value: string): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

interface FrNbaPlayerFormProps {
  player: FrNbaPlayer | null;
  open: boolean;
  onClose: () => void;
  onSaved: (player: FrNbaPlayer) => void;
}

function FrNbaPlayerFormFields({
  player,
  onClose,
  onSaved,
}: {
  player: FrNbaPlayer | null;
  onClose: () => void;
  onSaved: (player: FrNbaPlayer) => void;
}) {
  const t = useTranslations();
  const [form, setForm] = useState(() => initialForm(player));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      const saved = await saveFrNbaPlayer(
        player ? { id: player.id, ...form } : form
      );
      onSaved(saved);
      onClose();
    } catch {
      setError(t("errors.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid gap-3 py-2">
        <div className="space-y-1">
          <Label htmlFor="fr-nba-player">{t("guides.frNba.player")}</Label>
          <Input
            id="fr-nba-player"
            value={form.player}
            onChange={(e) => setForm({ ...form, player: e.target.value })}
            disabled={saving}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="fr-nba-draft-year">{t("guides.frNba.draftYear")}</Label>
            <Input
              id="fr-nba-draft-year"
              value={form.draftYear}
              onChange={(e) => setForm({ ...form, draftYear: e.target.value })}
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fr-nba-drafted-by">{t("guides.frNba.draftedBy")}</Label>
            <Input
              id="fr-nba-drafted-by"
              value={form.draftedBy}
              onChange={(e) => setForm({ ...form, draftedBy: e.target.value })}
              disabled={saving}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="fr-nba-rookie">{t("guides.frNba.rookieCard")}</Label>
            <select
              id="fr-nba-rookie"
              value={form.rookieCard === null ? "" : String(form.rookieCard)}
              onChange={(e) =>
                setForm({
                  ...form,
                  rookieCard: parseOptionalBool(e.target.value),
                })
              }
              disabled={saving}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">{t("guides.frNba.unset")}</option>
              <option value="true">{t("guides.frNba.yes")}</option>
              <option value="false">{t("guides.frNba.no")}</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="fr-nba-auto">{t("guides.frNba.auto")}</Label>
            <select
              id="fr-nba-auto"
              value={form.auto ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  auto: e.target.value || null,
                })
              }
              disabled={saving}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">{t("guides.frNba.unset")}</option>
              <option value="On card">On card</option>
              <option value="Sticker">Sticker</option>
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="fr-nba-patch">{t("guides.frNba.patch")}</Label>
            <select
              id="fr-nba-patch"
              value={form.patch === null ? "" : String(form.patch)}
              onChange={(e) =>
                setForm({
                  ...form,
                  patch: parseOptionalBool(e.target.value),
                })
              }
              disabled={saving}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">{t("guides.frNba.unset")}</option>
              <option value="true">{t("guides.frNba.yes")}</option>
              <option value="false">{t("guides.frNba.no")}</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="fr-nba-immaculate">{t("guides.frNba.immaculate")}</Label>
            <select
              id="fr-nba-immaculate"
              value={form.immaculate === null ? "" : String(form.immaculate)}
              onChange={(e) =>
                setForm({
                  ...form,
                  immaculate: parseOptionalBool(e.target.value),
                })
              }
              disabled={saving}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">{t("guides.frNba.unset")}</option>
              <option value="true">{t("guides.frNba.yes")}</option>
              <option value="false">{t("guides.frNba.no")}</option>
            </select>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button type="button" onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      </DialogFooter>
    </>
  );
}

export function FrNbaPlayerForm({
  player,
  open,
  onClose,
  onSaved,
}: FrNbaPlayerFormProps) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {player ? t("guides.frNba.editTitle") : t("guides.frNba.addTitle")}
          </DialogTitle>
        </DialogHeader>
        {open ? (
          <FrNbaPlayerFormFields
            key={player?.id ?? "new"}
            player={player}
            onClose={onClose}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
