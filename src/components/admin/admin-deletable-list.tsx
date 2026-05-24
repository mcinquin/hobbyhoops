"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

interface AdminDeletableListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderLabel: (item: T) => string;
  onDelete: (item: T) => Promise<void>;
  emptyLabel: string;
  disabled?: boolean;
  className?: string;
}

export function AdminDeletableList<T>({
  items,
  getKey,
  renderLabel,
  onDelete,
  emptyLabel,
  disabled,
  className,
}: AdminDeletableListProps<T>) {
  const t = useTranslations();
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await onDelete(deleteTarget);
      setDeleteTarget(null);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>{emptyLabel}</p>
    );
  }

  return (
    <>
      <ul
        className={cn(
          "grid gap-1 sm:grid-cols-2 lg:grid-cols-3",
          className
        )}
      >
        {items.map((item) => (
          <li
            key={getKey(item)}
            className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-accent/50"
          >
            <span className="min-w-0 truncate text-sm">{renderLabel(item)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              disabled={disabled || loading}
              aria-label={t("admin.deleteItem", { name: renderLabel(item) })}
              onClick={() => setDeleteTarget(item)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget
              ? t("admin.deleteConfirmNamed", { name: renderLabel(deleteTarget) })
              : null}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setDeleteTarget(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={loading}
              onClick={() => void confirmDelete()}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
