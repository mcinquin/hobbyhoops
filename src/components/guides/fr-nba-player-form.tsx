"use client";

import { useState } from "react";
import { saveFrNbaPlayer } from "@/lib/guides-client";
import type {
  FrNbaAutoStyle,
  FrNbaHolding,
  FrNbaHoldingType,
  FrNbaPlayer,
  FrNbaPlayerWrite,
} from "@/lib/types";
import {
  FR_NBA_AUTO_STYLES,
  FR_NBA_HOLDING_TYPES,
  holdingNeedsAutoStyle,
} from "@/lib/fr-nba";
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
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface HoldingDraft {
  key: string;
  type: FrNbaHoldingType;
  autoStyle: FrNbaAutoStyle | "";
  rookie: boolean;
}

interface FrNbaFormState {
  player: string;
  draftYear: string;
  draftedBy: string;
  rpa: boolean | null;
  holdings: HoldingDraft[];
}

const EMPTY_FORM: FrNbaFormState = {
  player: "",
  draftYear: "",
  draftedBy: "",
  rpa: null,
  holdings: [],
};

function createHoldingDraft(
  holding?: FrNbaHolding,
  key?: string
): HoldingDraft {
  return {
    key: key ?? `holding-${crypto.randomUUID()}`,
    type: holding?.type ?? "auto",
    autoStyle: holding?.autoStyle ?? "",
    rookie: holding?.rookie ?? false,
  };
}

function initialForm(player: FrNbaPlayer | null): FrNbaFormState {
  if (!player) return EMPTY_FORM;
  return {
    player: player.player,
    draftYear: player.draftYear,
    draftedBy: player.draftedBy,
    rpa: player.rpa,
    holdings: player.holdings.map((holding) =>
      createHoldingDraft(holding, `holding-${holding.id}`)
    ),
  };
}

function parseOptionalBool(value: string): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function holdingsToPayload(
  holdings: HoldingDraft[]
): Omit<FrNbaHolding, "id">[] {
  return holdings.map((holding) => ({
    type: holding.type,
    autoStyle: holdingNeedsAutoStyle(holding.type)
      ? (holding.autoStyle as FrNbaAutoStyle)
      : null,
    rookie: holding.type === "rpa" ? true : holding.rookie,
  }));
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

  function updateHolding(key: string, patch: Partial<HoldingDraft>) {
    setForm((current) => ({
      ...current,
      holdings: current.holdings.map((holding) => {
        if (holding.key !== key) return holding;
        const next = { ...holding, ...patch };
        if (patch.type && !holdingNeedsAutoStyle(patch.type)) {
          next.autoStyle = "";
        }
        if (patch.type === "rpa") {
          next.rookie = true;
        }
        if (patch.type && holdingNeedsAutoStyle(patch.type) && !next.autoStyle) {
          next.autoStyle = "on_card";
        }
        return next;
      }),
    }));
  }

  function removeHolding(key: string) {
    setForm((current) => ({
      ...current,
      holdings: current.holdings.filter((holding) => holding.key !== key),
    }));
  }

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      const holdings = holdingsToPayload(form.holdings);
      const hasRpaHolding = holdings.some((holding) => holding.type === "rpa");
      const payload: FrNbaPlayerWrite = {
        player: form.player,
        draftYear: form.draftYear,
        draftedBy: form.draftedBy,
        rpa: hasRpaHolding ? true : form.rpa,
        holdings,
      };
      const saved = await saveFrNbaPlayer(
        player ? { id: player.id, ...payload } : payload
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
      <div className="grid gap-4 py-2">
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

        <div className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{t("guides.frNba.holdings")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  holdings: [...current.holdings, createHoldingDraft()],
                }))
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("guides.frNba.addHolding")}
            </Button>
          </div>

          {form.holdings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("guides.frNba.noHoldings")}
            </p>
          ) : (
            <div className="space-y-3">
              {form.holdings.map((holding) => (
                <div
                  key={holding.key}
                  className="grid gap-2 rounded-md border border-border/80 bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                >
                  <div className="space-y-1">
                    <Label>{t("guides.frNba.holdingTypeLabel")}</Label>
                    <select
                      value={holding.type}
                      onChange={(e) =>
                        updateHolding(holding.key, {
                          type: e.target.value as FrNbaHoldingType,
                        })
                      }
                      disabled={saving}
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {FR_NBA_HOLDING_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {t(`guides.frNba.holdingType.${type}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label>{t("guides.frNba.autoStyleLabel")}</Label>
                    <select
                      value={holding.autoStyle}
                      onChange={(e) =>
                        updateHolding(holding.key, {
                          autoStyle: e.target.value as FrNbaAutoStyle | "",
                        })
                      }
                      disabled={
                        saving || !holdingNeedsAutoStyle(holding.type)
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">{t("guides.frNba.unset")}</option>
                      {FR_NBA_AUTO_STYLES.map((style) => (
                        <option key={style} value={style}>
                          {t(`guides.frNba.autoStyle.${style === "on_card" ? "onCard" : "sticker"}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    {holding.type === "rpa" ? (
                      <div className="flex h-9 items-center text-xs text-muted-foreground">
                        {t("guides.frNba.rpaIncludesRc")}
                      </div>
                    ) : (
                      <>
                        <Label>{t("guides.frNba.rookieShort")}</Label>
                        <select
                          value={String(holding.rookie)}
                          onChange={(e) =>
                            updateHolding(holding.key, {
                              rookie: e.target.value === "true",
                            })
                          }
                          disabled={saving}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="true">{t("guides.frNba.yes")}</option>
                          <option value="false">{t("guides.frNba.no")}</option>
                        </select>
                      </>
                    )}
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      disabled={saving}
                      aria-label={t("guides.frNba.removeHolding")}
                      onClick={() => removeHolding(holding.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="fr-nba-rpa">{t("guides.frNba.rpaObjective")}</Label>
          <select
            id="fr-nba-rpa"
            value={form.rpa === null ? "" : String(form.rpa)}
            onChange={(e) =>
              setForm({
                ...form,
                rpa: parseOptionalBool(e.target.value),
              })
            }
            disabled={saving}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">{t("guides.frNba.unset")}</option>
            <option value="true">{t("guides.frNba.yes")}</option>
            <option value="false">{t("guides.frNba.no")}</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {t("guides.frNba.rpaObjectiveHint")}
          </p>
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
