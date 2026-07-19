"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  References,
  type CardListItem,
  type CardsPageResult,
} from "@/lib/types";
import {
  ADMIN_CARDS_PAGE_SIZE,
  COLLECTION_TAG_VALUES,
  setsForBrandFilter,
  variationsForFilters,
  type CollectionListQuery,
} from "@/lib/collection-query";
import { createCard, deleteCard, fetchCardsPage, updateCard } from "@/lib/cards-client";
import { fetchReferences } from "@/lib/references-client";
import { FilterChipButton } from "@/components/filter-chip-button";
import { CardForm } from "@/components/card-form";
import { CardBadges } from "@/components/card-badges";
import { ColumnFilterCombobox } from "@/components/column-filter-combobox";
import { PaginationControls } from "@/components/data-table/pagination-controls";
import { Button } from "@/components/ui/button";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CollectionSearchInput } from "@/components/collection-search-input";
import { useTranslations } from "@/i18n/client";
import { useCollectionUrlFilters } from "@/hooks/use-collection-url-filters";
import { useCardBadgeLabels } from "@/hooks/use-card-badge-labels";

function listItemToEditableCard(card: CardListItem): Card {
  return { ...card, photo: null };
}

/** Cascade brand → set/variation when the parent filter changes. */
function brandFilterPatch(brand: string): Partial<CollectionListQuery> {
  return { brand, set: "", variation: "" };
}

/** Cascade set → variation when the set filter is cleared. */
function setFilterPatch(set: string): Partial<CollectionListQuery> {
  return set.trim() ? { set } : { set: "", variation: "" };
}

interface AdminCardsSectionProps {
  references: References;
  onReferencesChange: (references: References) => void;
  onTotalCountChange?: (count: number) => void;
  reloadToken?: number;
}

export function AdminCardsSection({
  references,
  onReferencesChange,
  onTotalCountChange,
  reloadToken = 0,
}: AdminCardsSectionProps) {
  const t = useTranslations();
  const badgeLabels = useCardBadgeLabels();
  const { filters, updateFilters, toggleTag, isPending } = useCollectionUrlFilters({
    fixedPageSize: ADMIN_CARDS_PAGE_SIZE,
  });
  const [pageData, setPageData] = useState<CardsPageResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CardListItem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applyAdminFilters = useCallback(
    (
      patch: Partial<CollectionListQuery>,
      opts?: { immediate?: boolean; resetPage?: boolean }
    ) => {
      updateFilters({ ...patch, page: 1 }, opts);
    },
    [updateFilters]
  );

  const setSuggestions = useMemo(
    () => setsForBrandFilter(references, filters.brand),
    [references, filters.brand]
  );

  const variationSuggestions = useMemo(
    () => variationsForFilters(references, filters.brand, filters.set),
    [references, filters.brand, filters.set]
  );

  // Keep URL hygiene only: set requires a brand. Never validate partial
  // keystrokes against suggestions — that wiped in-progress typing.
  useEffect(() => {
    if (!filters.brand.trim() && filters.set) {
      applyAdminFilters({ set: "", variation: "" }, { immediate: true });
    }
  }, [applyAdminFilters, filters.brand, filters.set]);

  const displayedCards = pageData?.cards ?? [];
  const selectedTags = useMemo(
    () => new Set(filters.tags),
    [filters.tags]
  );

  const applyPageData = useCallback(
    (data: CardsPageResult) => {
      setPageData(data);
      onTotalCountChange?.(data.totalCount);
    },
    [onTotalCountChange]
  );

  const loadPage = useCallback(async () => {
    setFetchError(null);
    try {
      applyPageData(await fetchCardsPage(filters));
    } catch {
      setFetchError(t("admin.loadError"));
    }
  }, [applyPageData, filters, t]);

  useEffect(() => {
    let active = true;
    fetchCardsPage(filters)
      .then((data) => {
        if (!active) return;
        applyPageData(data);
      })
      .catch(() => {
        if (!active) return;
        setFetchError(t("admin.loadError"));
      });
    return () => {
      active = false;
    };
  }, [applyPageData, filters, reloadToken, t]);

  const pageCount = pageData?.pageCount ?? 1;
  const totalCount = pageData?.totalCount ?? 0;

  async function refreshReferences() {
    try {
      onReferencesChange(await fetchReferences());
    } catch {
      /* ignore */
    }
  }

  async function handleSave(cardData: Partial<Card>): Promise<boolean> {
    setSaveError(null);
    setSuccess(null);
    try {
      if (editingCard) {
        await updateCard({ ...editingCard, ...cardData });
        setEditingCard(null);
        setFormOpen(false);
        setSuccess(t("admin.cards.updated"));
      } else {
        await createCard(cardData);
        setEditingCard(null);
        setFormOpen(false);
        setSuccess(t("admin.cards.created"));
      }
      void loadPage();
      void refreshReferences();
      return true;
    } catch (err) {
      setSaveError(
        err instanceof Error && err.message
          ? err.message
          : t("admin.cards.saveFailed")
      );
      return false;
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSuccess(null);
    try {
      await deleteCard(deleteTarget.id);
      setSuccess(t("admin.cards.deleted"));
      void loadPage();
      void refreshReferences();
    } catch {
      /* ignore */
    }
    setDeleteTarget(null);
  }

  return (
    <div
      className="min-w-0 space-y-6"
      aria-busy={isPending || pageData === null}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm text-muted-foreground">
          {t("admin.cards.intro")}
        </p>
        <Button
          size="sm"
          className="w-full sm:w-auto"
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
        error={saveError ?? fetchError}
        onSuccessDismiss={() => setSuccess(null)}
      />

      <CollectionSearchInput
        urlValue={filters.search}
        onSearch={(value) =>
          applyAdminFilters({ search: value }, { immediate: true })
        }
        label={t("admin.cards.search")}
        placeholder={t("admin.cards.search")}
      />

      <div className="grid gap-2 md:hidden">
        <ColumnFilterCombobox
          value={filters.player}
          onChange={(value) =>
            applyAdminFilters({ player: value }, { immediate: !value.trim() })
          }
          placeholder={t("admin.cards.filterPlayerTeam")}
          suggestions={references.players}
          clearOptionLabel={t("cards.selectNone")}
          className="h-9 text-xs"
        />
        <ColumnFilterCombobox
          value={filters.team}
          onChange={(value) =>
            applyAdminFilters({ team: value }, { immediate: !value.trim() })
          }
          placeholder={t("admin.cards.filterTeam")}
          suggestions={references.teams}
          clearOptionLabel={t("cards.selectNone")}
          className="h-9 text-xs"
        />
        <ColumnFilterCombobox
          value={filters.year}
          onChange={(value) =>
            applyAdminFilters({ year: value }, { immediate: !value.trim() })
          }
          placeholder={t("admin.cards.filterYear")}
          suggestions={references.years}
          clearOptionLabel={t("cards.selectNone")}
          className="h-9 text-xs"
        />
        <div className="flex flex-wrap gap-1">
          {COLLECTION_TAG_VALUES.map((tag) => (
            <FilterChipButton
              key={tag}
              label={badgeLabels[tag]}
              pressed={selectedTags.has(tag)}
              onPressedChange={() => toggleTag(tag)}
            />
          ))}
        </div>
        <ColumnFilterCombobox
          value={filters.brand}
          onChange={(value) =>
            applyAdminFilters(brandFilterPatch(value), {
              immediate: !value.trim(),
            })
          }
          placeholder={t("admin.cards.filterBrand")}
          suggestions={references.brands}
          clearOptionLabel={t("cards.selectNone")}
          className="h-9 text-xs"
        />
        <ColumnFilterCombobox
          value={filters.set}
          onChange={(value) =>
            applyAdminFilters(setFilterPatch(value), {
              immediate: !value.trim(),
            })
          }
          placeholder={
            filters.brand.trim()
              ? t("admin.cards.filterSet")
              : t("cards.setNeedsBrand")
          }
          suggestions={setSuggestions}
          disabled={!filters.brand.trim()}
          clearOptionLabel={t("cards.selectNone")}
          className="h-9 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        />
        <ColumnFilterCombobox
          value={filters.variation}
          onChange={(value) =>
            applyAdminFilters({ variation: value }, { immediate: !value.trim() })
          }
          placeholder={t("admin.cards.filterVariation")}
          suggestions={variationSuggestions}
          clearOptionLabel={t("cards.selectNone")}
          className="h-9 text-xs"
        />
      </div>

      <div className="space-y-2 md:hidden">
        {displayedCards.length ? (
          displayedCards.map((card) => {
            const meta = [card.team, card.year].filter(Boolean).join(" · ");
            const catalog = [card.brand, card.set].filter(Boolean).join(" · ");

            return (
              <article
                key={card.id}
                className="rounded-lg border border-border bg-card p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium leading-tight">
                      {card.player}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
                  </div>
                  <CardBadges card={card} labels={badgeLabels} />
                </div>

                <div className="mt-2 space-y-0.5 text-sm">
                  <p className="truncate text-muted-foreground">{catalog}</p>
                  <p className="truncate">{card.variation}</p>
                </div>

                <div className="mt-2 flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("admin.cards.editCard", {
                      player: card.player,
                    })}
                    onClick={() => {
                      setEditingCard(listItemToEditableCard(card));
                      setSaveError(null);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    aria-label={t("admin.cards.deleteCard", {
                      player: card.player,
                    })}
                    onClick={() => setDeleteTarget(card)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {t("common.delete")}
                  </Button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
            {pageData === null ? t("common.loading") : t("cards.noneFound")}
          </div>
        )}
      </div>

      <div className="hidden rounded-md border border-border md:block md:overflow-auto">
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
                  value={filters.player}
                  onChange={(value) =>
                    updateFilters({ player: value, page: 1 }, { immediate: true })
                  }
                  placeholder={t("admin.cards.filterPlayerTeam")}
                  suggestions={references.players}
                  clearOptionLabel={t("cards.selectNone")}
                  className="h-8 min-w-44 text-xs font-normal"
                />
              </TableHead>
              <TableHead>
                <ColumnFilterCombobox
                  value={filters.team}
                  onChange={(value) =>
                    updateFilters({ team: value, page: 1 }, { immediate: true })
                  }
                  placeholder={t("admin.cards.filterTeam")}
                  suggestions={references.teams}
                  clearOptionLabel={t("cards.selectNone")}
                  className="h-8 min-w-36 text-xs font-normal"
                />
              </TableHead>
              <TableHead>
                <ColumnFilterCombobox
                  value={filters.year}
                  onChange={(value) =>
                    updateFilters({ year: value, page: 1 }, { immediate: true })
                  }
                  placeholder={t("admin.cards.filterYear")}
                  suggestions={references.years}
                  clearOptionLabel={t("cards.selectNone")}
                  className="h-8 min-w-24 text-xs font-normal"
                />
              </TableHead>
              <TableHead>
                <ColumnFilterCombobox
                  value={filters.brand}
                  onChange={(value) =>
                    updateFilters(
                      { ...brandFilterPatch(value), page: 1 },
                      { immediate: !value.trim() }
                    )
                  }
                  placeholder={t("admin.cards.filterBrand")}
                  suggestions={references.brands}
                  clearOptionLabel={t("cards.selectNone")}
                  className="h-8 min-w-36 text-xs font-normal"
                />
              </TableHead>
              <TableHead>
                <ColumnFilterCombobox
                  value={filters.set}
                  onChange={(value) =>
                    updateFilters(
                      { ...setFilterPatch(value), page: 1 },
                      { immediate: !value.trim() }
                    )
                  }
                  placeholder={
                    filters.brand.trim()
                      ? t("admin.cards.filterSet")
                      : t("cards.setNeedsBrand")
                  }
                  suggestions={setSuggestions}
                  disabled={!filters.brand.trim()}
                  clearOptionLabel={t("cards.selectNone")}
                  className="h-8 min-w-44 text-xs font-normal disabled:cursor-not-allowed disabled:opacity-50"
                />
              </TableHead>
              <TableHead>
                <ColumnFilterCombobox
                  value={filters.variation}
                  onChange={(value) =>
                    updateFilters(
                      { variation: value, page: 1 },
                      { immediate: !value.trim() }
                    )
                  }
                  placeholder={t("admin.cards.filterVariation")}
                  suggestions={variationSuggestions}
                  clearOptionLabel={t("cards.selectNone")}
                  className="h-8 min-w-40 text-xs font-normal"
                />
              </TableHead>
              <TableHead>
                <div className="flex flex-wrap gap-1">
                  {COLLECTION_TAG_VALUES.map((tag) => (
                    <FilterChipButton
                      key={tag}
                      label={badgeLabels[tag]}
                      pressed={selectedTags.has(tag)}
                      onPressedChange={() => toggleTag(tag)}
                    />
                  ))}
                </div>
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedCards.map((card) => (
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
                        setEditingCard(listItemToEditableCard(card));
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

      {pageCount > 1 ? (
        <PaginationControls
          page={filters.page}
          pageCount={pageCount}
          onPageChange={(nextPage) =>
            updateFilters({ page: nextPage }, { immediate: true })
          }
          summary={t("admin.cards.pageInfo", {
            page: filters.page,
            total: pageCount,
            count: totalCount,
          })}
        />
      ) : null}

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
            <Button variant="destructive" onClick={() => void handleDelete()}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
