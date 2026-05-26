"use client";

import { useTranslations } from "@/i18n/client";
import { TablePageSkeleton } from "@/components/skeletons/page-skeletons";

export function AdminTabLoading() {
  const t = useTranslations();
  return (
    <div className="space-y-3">
      <p className="sr-only">{t("common.loading")}</p>
      <TablePageSkeleton />
    </div>
  );
}
