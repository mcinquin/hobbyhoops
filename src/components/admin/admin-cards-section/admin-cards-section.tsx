"use client";

import { Plus } from "lucide-react";
import type { References } from "@/lib/types";
import { ADMIN_CARDS_PAGE_SIZE } from "@/lib/collection-query";
import { CardForm } from "@/components/card-form";
import { PaginationControls } from "@/components/data-table/pagination-controls";
import { Button } from "@/components/ui/button";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { CollectionSearchInput } from "@/components/collection-search-input";
import { useTranslations } from "@/i18n/client";
import { useCollectionUrlFilters } from "@/hooks/use-collection-url-filters";
import { useCardBadgeLabels } from "@/hooks/use-card-badge-labels";
import { useAdminCards } from "./use-admin-cards";
import { useAdminColumnFilters } from "./use-admin-column-filters";
import { AdminCardsMobileFilters, AdminCardsMobileList } from "./admin-cards-mobile";
import { AdminCardsTable } from "./admin-cards-table";
import { DeleteCardDialog } from "./delete-card-dialog";

interface AdminCardsSectionProps {
  references: References;
  onReferencesChange: (references: References) => void;
  onTotalCountChange?: (count: number) => void;
  reloadToken?: number;
}

/** Admin cards tab: filterable card list with create, edit and delete. */
export function AdminCardsSection({
  references,
  onReferencesChange,
  onTotalCountChange,
  reloadToken = 0,
}: AdminCardsSectionProps) {
  const t = useTranslations();
  const badgeLabels = useCardBadgeLabels();
  const urlFilters = useCollectionUrlFilters({ fixedPageSize: ADMIN_CARDS_PAGE_SIZE });
  const { filters, updateFilters, toggleTag, isPending } = urlFilters;
  const { columns, applyFilter } = useAdminColumnFilters(references, urlFilters);
  const { pageData, feedback, form, deletion } = useAdminCards({
    filters,
    onReferencesChange,
    onTotalCountChange,
    reloadToken,
  });

  const displayedCards = pageData?.cards ?? [];
  const pageCount = pageData?.pageCount ?? 1;
  const totalCount = pageData?.totalCount ?? 0;
  const openEdit = (card: (typeof displayedCards)[number]) => void form.openEdit(card);

  return (
    <div className="min-w-0 space-y-6" aria-busy={isPending || pageData === null}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm text-muted-foreground">{t("admin.cards.intro")}</p>
        <Button size="sm" className="w-full sm:w-auto" onClick={form.openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          {t("admin.cards.addCard")}
        </Button>
      </div>

      <AdminFeedback
        success={feedback.success}
        error={feedback.error}
        onSuccessDismiss={feedback.dismissSuccess}
      />

      <CollectionSearchInput
        urlValue={filters.search}
        onSearch={(value) =>
          updateFilters({ search: value, page: 1 }, { immediate: true })
        }
        label={t("admin.cards.search")}
        placeholder={t("admin.cards.search")}
      />

      <AdminCardsMobileFilters
        columns={columns}
        onApply={applyFilter}
        selectedTags={filters.tags}
        onToggleTag={toggleTag}
        badgeLabels={badgeLabels}
      />

      <AdminCardsMobileList
        cards={displayedCards}
        isLoading={pageData === null}
        badgeLabels={badgeLabels}
        onEdit={openEdit}
        onDelete={deletion.request}
      />

      <AdminCardsTable
        cards={displayedCards}
        columns={columns}
        onApply={applyFilter}
        selectedTags={filters.tags}
        onToggleTag={toggleTag}
        badgeLabels={badgeLabels}
        onEdit={openEdit}
        onDelete={deletion.request}
      />

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
        card={form.card}
        references={references}
        open={form.open}
        onClose={form.close}
        onSave={form.save}
        saveError={form.saveError}
      />

      <DeleteCardDialog
        target={deletion.target}
        onCancel={() => deletion.request(null)}
        onConfirm={() => void deletion.confirm()}
      />
    </div>
  );
}
