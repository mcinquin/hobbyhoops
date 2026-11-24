"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Card,
  CardListItem,
  CardsPageResult,
  References,
} from "@/lib/types";
import type { CollectionListQuery } from "@/lib/collection-query";
import {
  createCard,
  deleteCard,
  fetchCardById,
  fetchCardsPage,
  updateCard,
} from "@/lib/cards-client";
import { fetchReferences } from "@/lib/references-client";
import { useTranslations } from "@/i18n/client";

interface UseAdminCardsOptions {
  filters: CollectionListQuery;
  onReferencesChange: (references: References) => void;
  onTotalCountChange?: (count: number) => void;
  reloadToken: number;
}

/**
 * Admin cards data: current page (refetched on filter / reload changes),
 * create / edit / delete flows and their feedback messages.
 */
export function useAdminCards({
  filters,
  onReferencesChange,
  onTotalCountChange,
  reloadToken,
}: UseAdminCardsOptions) {
  const t = useTranslations();
  const [pageData, setPageData] = useState<CardsPageResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CardListItem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const saveErrorMessage = (err: unknown) =>
    err instanceof Error && err.message ? err.message : t("admin.cards.saveFailed");

  async function refreshReferences() {
    try {
      onReferencesChange(await fetchReferences());
    } catch {
      /* ignore */
    }
  }

  function openCreate() {
    setEditingCard(null);
    setSaveError(null);
    setSuccess(null);
    setFormOpen(true);
  }

  async function openEdit(card: CardListItem) {
    setSaveError(null);
    setSuccess(null);
    try {
      const full = await fetchCardById(card.id);
      setEditingCard(full);
      setFormOpen(true);
    } catch (err) {
      setSaveError(saveErrorMessage(err));
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditingCard(null);
    setSaveError(null);
  }

  async function save(cardData: Partial<Card>): Promise<Card | false> {
    setSaveError(null);
    setSuccess(null);
    const wasEditing = Boolean(editingCard);
    try {
      const saved = editingCard
        ? await updateCard({ ...editingCard, ...cardData })
        : await createCard(cardData);
      setEditingCard(null);
      setSuccess(wasEditing ? t("admin.cards.updated") : t("admin.cards.created"));
      void loadPage();
      void refreshReferences();
      return saved;
    } catch (err) {
      setSaveError(saveErrorMessage(err));
      return false;
    }
  }

  async function confirmDelete() {
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

  return {
    pageData,
    feedback: {
      success,
      error: saveError ?? fetchError,
      dismissSuccess: () => setSuccess(null),
    },
    form: { open: formOpen, card: editingCard, saveError, openCreate, openEdit, close: closeForm, save },
    deletion: { target: deleteTarget, request: setDeleteTarget, confirm: confirmDelete },
  };
}
