"use client";

import type { CardListItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslations } from "@/i18n/client";

interface DeleteCardDialogProps {
  target: CardListItem | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation dialog before deleting a card from the admin list. */
export function DeleteCardDialog({ target, onCancel, onConfirm }: DeleteCardDialogProps) {
  const t = useTranslations();
  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.cards.deleteTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {target
            ? t("admin.cards.deleteConfirmNamed", {
                player: target.player,
                variation: target.variation,
              })
            : null}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
