"use client";

import { useState, useMemo } from "react";
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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface AdminCardsSectionProps {
  cards: Card[];
  references: References;
  onCardsChange: (cards: Card[]) => void;
  onReferencesChange: (references: References) => void;
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
  const [page, setPage] = useState(0);
  const pageSize = 30;

  const filtered = useMemo(() => {
    if (!search) return cards;
    const q = search.toLowerCase();
    return cards.filter(
      (c) =>
        c.player.toLowerCase().includes(q) ||
        c.team.toLowerCase().includes(q) ||
        c.set.toLowerCase().includes(q) ||
        c.variation.toLowerCase().includes(q)
    );
  }, [cards, search]);

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
        await refreshCards();
        setEditingCard(null);
        setFormOpen(false);
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
      setPage(Math.max(0, Math.ceil(nextCards.length / pageSize) - 1));
      await refreshCards();
      setEditingCard(null);
      setFormOpen(false);
      return true;
    } catch {
      setSaveError(t("admin.cards.saveFailed"));
      return false;
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/cards?id=${deleteTarget.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      onCardsChange(cards.filter((c) => c.id !== deleteTarget.id));
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
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("admin.cards.addCard")}
        </Button>
      </div>

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
              <TableHead>{t("cards.year")}</TableHead>
              <TableHead>{t("admin.cards.brandSet")}</TableHead>
              <TableHead>{t("cards.variation")}</TableHead>
              <TableHead>{t("cards.tags")}</TableHead>
              <TableHead className="w-[100px]">{t("admin.cards.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((card) => (
              <TableRow key={card.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{card.player}</p>
                    <p className="text-xs text-muted-foreground">{card.team}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{card.year}</TableCell>
                <TableCell className="text-sm">
                  {card.brand} / {card.set}
                </TableCell>
                <TableCell className="text-sm max-w-[180px] truncate">
                  {card.variation}
                </TableCell>
                <TableCell>
                  <CardBadges card={card} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
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
