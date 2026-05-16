"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { Card, References } from "@/lib/types";
import { CardForm } from "@/components/card-form";
import { CardBadges } from "@/components/card-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface AdminCardsSectionProps {
  cards: Card[];
  references: References;
  onCardsChange: (cards: Card[]) => void;
  onReferencesChange: (references: References) => void;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

interface ColumnFilterComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions: string[];
  className?: string;
}

function ColumnFilterCombobox({
  value,
  onChange,
  placeholder,
  suggestions,
  className,
}: ColumnFilterComboboxProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const query = value.trim().toLowerCase();
  const visibleSuggestions = useMemo(
    () =>
      suggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(query)
      ),
    [query, suggestions]
  );

  function selectSuggestion(nextValue: string): void {
    onChange(nextValue);
    setOpen(false);
    setActiveIndex(0);
  }

  return (
    <div className="relative">
      <Input
        id={inputId}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
            setOpen(true);
            return;
          }
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (visibleSuggestions.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % visibleSuggestions.length);
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(
              (index) =>
                (index - 1 + visibleSuggestions.length) %
                visibleSuggestions.length
            );
          }
          if (event.key === "Enter" && open) {
            event.preventDefault();
            selectSuggestion(visibleSuggestions[activeIndex]);
          }
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open && visibleSuggestions.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        className={className}
      />
      {open && visibleSuggestions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 text-xs font-normal shadow-lg"
        >
          {visibleSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className="block w-full rounded px-2 py-1.5 text-left hover:bg-accent aria-selected:bg-accent"
              onMouseDown={(event) => {
                event.preventDefault();
                selectSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminCardsSection({
  cards,
  references,
  onCardsChange,
  onReferencesChange,
}: AdminCardsSectionProps) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [playerColumnFilter, setPlayerColumnFilter] = useState("");
  const [teamColumnFilter, setTeamColumnFilter] = useState("");
  const [yearColumnFilter, setYearColumnFilter] = useState("");
  const [brandColumnFilter, setBrandColumnFilter] = useState("");
  const [setColumnFilter, setSetColumnFilter] = useState("");
  const [variationColumnFilter, setVariationColumnFilter] = useState("");
  const [tagsColumnFilter, setTagsColumnFilter] = useState("");
  const deferredSearch = useDeferredValue(search);
  const deferredPlayerColumnFilter = useDeferredValue(playerColumnFilter);
  const deferredTeamColumnFilter = useDeferredValue(teamColumnFilter);
  const deferredYearColumnFilter = useDeferredValue(yearColumnFilter);
  const deferredBrandColumnFilter = useDeferredValue(brandColumnFilter);
  const deferredSetColumnFilter = useDeferredValue(setColumnFilter);
  const deferredVariationColumnFilter = useDeferredValue(variationColumnFilter);
  const deferredTagsColumnFilter = useDeferredValue(tagsColumnFilter);
  const pageSize = 30;
  const badgeLabels = useMemo(
    () => ({
      rookie: t("badges.rookie"),
      autograph: t("badges.autograph"),
      memorabilia: t("badges.memorabilia"),
      tradable: t("badges.tradable"),
    }),
    [t]
  );
  const columnSuggestions = useMemo(
    () => ({
      players: uniqueSorted(cards.map((card) => card.player)),
      teams: uniqueSorted(cards.map((card) => card.team)),
      years: uniqueSorted(cards.map((card) => card.year ?? "")),
      brands: uniqueSorted(cards.map((card) => card.brand)),
      sets: uniqueSorted(
        cards
          .filter(
            (card) =>
              !brandColumnFilter ||
              card.brand.toLowerCase().includes(brandColumnFilter.toLowerCase())
          )
          .map((card) => card.set)
      ),
      variations: uniqueSorted(cards.map((card) => card.variation)),
      tags: uniqueSorted([
        badgeLabels.rookie,
        badgeLabels.autograph,
        badgeLabels.memorabilia,
        badgeLabels.tradable,
      ]),
    }),
    [badgeLabels, brandColumnFilter, cards]
  );

  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    const playerQuery = deferredPlayerColumnFilter.toLowerCase();
    const teamQuery = deferredTeamColumnFilter.toLowerCase();
    const yearQuery = deferredYearColumnFilter.toLowerCase();
    const brandQuery = deferredBrandColumnFilter.toLowerCase();
    const setQuery = deferredSetColumnFilter.toLowerCase();
    const variationQuery = deferredVariationColumnFilter.toLowerCase();
    const tagsQuery = deferredTagsColumnFilter.toLowerCase();

    return cards.filter(
      (card) => {
        const playerValue = card.player.toLowerCase();
        const teamValue = card.team.toLowerCase();
        const brandValue = card.brand.toLowerCase();
        const setValue = card.set.toLowerCase();
        const brandSetValue = `${card.brand} / ${card.set}`.toLowerCase();
        const tagsValue = [
          card.rookie ? badgeLabels.rookie : "",
          card.autograph ? badgeLabels.autograph : "",
          card.memorabilia ? badgeLabels.memorabilia : "",
          card.tradable ? badgeLabels.tradable : "",
        ]
          .join(" ")
          .toLowerCase();

        return (
          (!q ||
            playerValue.includes(q) ||
            teamValue.includes(q) ||
            (card.year ?? "").toLowerCase().includes(q) ||
            brandSetValue.includes(q) ||
            card.variation.toLowerCase().includes(q)) &&
          (!playerQuery || playerValue.includes(playerQuery)) &&
          (!teamQuery || teamValue.includes(teamQuery)) &&
          (!yearQuery ||
            (card.year ?? "").toLowerCase().includes(yearQuery)) &&
          (!brandQuery || brandValue.includes(brandQuery)) &&
          (!setQuery || setValue.includes(setQuery)) &&
          (!variationQuery ||
            card.variation.toLowerCase().includes(variationQuery)) &&
          (!tagsQuery || tagsValue.includes(tagsQuery))
        );
      }
    );
  }, [
    badgeLabels,
    cards,
    deferredBrandColumnFilter,
    deferredPlayerColumnFilter,
    deferredSearch,
    deferredSetColumnFilter,
    deferredTagsColumnFilter,
    deferredTeamColumnFilter,
    deferredVariationColumnFilter,
    deferredYearColumnFilter,
  ]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  async function refreshCards(): Promise<Card[]> {
    const res = await fetch("/api/cards", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      return cards;
    }
    const data = (await res.json()) as Card[];
    onCardsChange(data);
    return data;
  }

  async function handleSave(cardData: Partial<Card>): Promise<boolean> {
    setSaveError(null);
    setSuccess(null);
    try {
      if (editingCard) {
        const res = await fetch("/api/cards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...editingCard, ...cardData }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveError(
            typeof data.error === "string" ? data.error : t("admin.cards.saveFailed")
          );
          return false;
        }
        const updated = data as Card;
        onCardsChange(cards.map((c) => (c.id === updated.id ? updated : c)));
        setEditingCard(null);
        setFormOpen(false);
        setSuccess(t("admin.cards.updated"));
        void refreshCards().catch(() => undefined);
        return true;
      }

      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(cardData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(
          typeof data.error === "string" ? data.error : t("admin.cards.saveFailed")
        );
        return false;
      }
      const created = data as Card;
      const nextCards = cards.some((c) => c.id === created.id)
        ? cards
        : [...cards, created];
      onCardsChange(nextCards);
      setSearch("");
      setPlayerColumnFilter("");
      setTeamColumnFilter("");
      setYearColumnFilter("");
      setBrandColumnFilter("");
      setSetColumnFilter("");
      setVariationColumnFilter("");
      setTagsColumnFilter("");
      setPage(Math.max(0, Math.ceil(nextCards.length / pageSize) - 1));
      setEditingCard(null);
      setFormOpen(false);
      setSuccess(t("admin.cards.created"));
      void refreshCards().catch(() => undefined);
      return true;
    } catch {
      setSaveError(t("admin.cards.saveFailed"));
      return false;
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSuccess(null);
    const res = await fetch(`/api/cards?id=${deleteTarget.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      onCardsChange(cards.filter((c) => c.id !== deleteTarget.id));
      setSuccess(t("admin.cards.deleted"));
    }
    setDeleteTarget(null);
  }

  async function refreshReferences() {
    const res = await fetch("/api/references", { credentials: "include" });
    if (res.ok) {
      onReferencesChange(await res.json());
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {t("admin.cards.intro")}
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditingCard(null);
            setSaveError(null);
            setSuccess(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("admin.cards.addCard")}
        </Button>
      </div>

      <AdminFeedback
        success={success}
        error={saveError}
        onSuccessDismiss={() => setSuccess(null)}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("admin.cards.search")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border border-border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("cards.player")}</TableHead>
              <TableHead>{t("cards.team")}</TableHead>
              <TableHead>{t("cards.year")}</TableHead>
              <TableHead>{t("cards.brand")}</TableHead>
              <TableHead>{t("cards.set")}</TableHead>
              <TableHead>{t("cards.variation")}</TableHead>
              <TableHead>{t("cards.tags")}</TableHead>
              <TableHead className="w-[100px]">{t("admin.cards.actions")}</TableHead>
            </TableRow>
            <TableRow>
              <TableHead>
                <ColumnFilterCombobox
                  value={playerColumnFilter}
                  onChange={(nextValue) => {
                    setPlayerColumnFilter(nextValue);
                    setPage(0);
                  }}
                  placeholder={t("admin.cards.filterPlayerTeam")}
                  suggestions={columnSuggestions.players}
                  className="h-8 min-w-44 text-xs font-normal"
                />
              </TableHead>
              <TableHead>
                <ColumnFilterCombobox
                  value={teamColumnFilter}
                  onChange={(nextValue) => {
                    setTeamColumnFilter(nextValue);
                    setPage(0);
                  }}
                  placeholder={t("admin.cards.filterTeam")}
                  suggestions={columnSuggestions.teams}
                  className="h-8 min-w-36 text-xs font-normal"
                />
              </TableHead>
              <TableHead>
                <ColumnFilterCombobox
                  value={yearColumnFilter}
                  onChange={(nextValue) => {
                    setYearColumnFilter(nextValue);
                    setPage(0);
                  }}
                  placeholder={t("admin.cards.filterYear")}
                  suggestions={columnSuggestions.years}
                  className="h-8 min-w-24 text-xs font-normal"
                />
              </TableHead>
              <TableHead>
                <ColumnFilterCombobox
                  value={brandColumnFilter}
                  onChange={(nextValue) => {
                    setBrandColumnFilter(nextValue);
                    setPage(0);
                  }}
                  placeholder={t("admin.cards.filterBrand")}
                  suggestions={columnSuggestions.brands}
                  className="h-8 min-w-36 text-xs font-normal"
                />
              </TableHead>
              <TableHead>
                <ColumnFilterCombobox
                  value={setColumnFilter}
                  onChange={(nextValue) => {
                    setSetColumnFilter(nextValue);
                    setPage(0);
                  }}
                  placeholder={t("admin.cards.filterSet")}
                  suggestions={columnSuggestions.sets}
                  className="h-8 min-w-44 text-xs font-normal"
                />
              </TableHead>
              <TableHead>
                <ColumnFilterCombobox
                  value={variationColumnFilter}
                  onChange={(nextValue) => {
                    setVariationColumnFilter(nextValue);
                    setPage(0);
                  }}
                  placeholder={t("admin.cards.filterVariation")}
                  suggestions={columnSuggestions.variations}
                  className="h-8 min-w-40 text-xs font-normal"
                />
              </TableHead>
              <TableHead>
                <ColumnFilterCombobox
                  value={tagsColumnFilter}
                  onChange={(nextValue) => {
                    setTagsColumnFilter(nextValue);
                    setPage(0);
                  }}
                  placeholder={t("admin.cards.filterTags")}
                  suggestions={columnSuggestions.tags}
                  className="h-8 min-w-36 text-xs font-normal"
                />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((card) => (
              <TableRow key={card.id}>
                <TableCell>
                  <p className="font-medium text-sm">{card.player}</p>
                </TableCell>
                <TableCell className="text-sm">{card.team}</TableCell>
                <TableCell className="text-sm">{card.year}</TableCell>
                <TableCell className="text-sm">{card.brand}</TableCell>
                <TableCell className="text-sm">{card.set}</TableCell>
                <TableCell className="text-sm max-w-[180px] truncate">
                  {card.variation}
                </TableCell>
                <TableCell>
                  <CardBadges card={card} labels={badgeLabels} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      aria-label={t("admin.cards.editCard", {
                        player: card.player,
                      })}
                      onClick={() => {
                        setEditingCard(card);
                        setSaveError(null);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      aria-label={t("admin.cards.deleteCard", {
                        player: card.player,
                      })}
                      onClick={() => setDeleteTarget(card)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("admin.cards.pageInfo", {
              page: page + 1,
              total: totalPages,
              count: filtered.length,
            })}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}

      <CardForm
        card={editingCard}
        references={references}
        open={formOpen}
        manageReferences={false}
        onClose={() => {
          setFormOpen(false);
          setEditingCard(null);
          setSaveError(null);
        }}
        onSave={handleSave}
        saveError={saveError}
        onReferencesUpdated={refreshReferences}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.cards.deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget
              ? t("admin.cards.deleteConfirmNamed", {
                  player: deleteTarget.player,
                  variation: deleteTarget.variation,
                })
              : null}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
