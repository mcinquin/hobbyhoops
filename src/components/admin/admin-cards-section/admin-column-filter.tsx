"use client";

import { ColumnFilterCombobox } from "@/components/column-filter-combobox";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import type {
  AdminColumnFilter as AdminColumnFilterConfig,
  ApplyAdminColumnFilter,
} from "./use-admin-column-filters";

interface AdminColumnFilterProps {
  filter: AdminColumnFilterConfig;
  onApply: ApplyAdminColumnFilter;
  /** Apply right away on every change; otherwise only when cleared (typing is debounced). */
  alwaysImmediate?: boolean;
  className: string;
}

/** One admin column filter combobox bound to the URL filters. */
export function AdminColumnFilter({
  filter,
  onApply,
  alwaysImmediate = false,
  className,
}: AdminColumnFilterProps) {
  const t = useTranslations();
  return (
    <ColumnFilterCombobox
      value={filter.value}
      onChange={(value) =>
        onApply(filter.key, value, {
          immediate: alwaysImmediate || !value.trim(),
        })
      }
      placeholder={filter.placeholder}
      suggestions={filter.suggestions}
      disabled={filter.disabled}
      clearOptionLabel={t("cards.selectNone")}
      className={cn(
        className,
        filter.disabled !== undefined &&
          "disabled:cursor-not-allowed disabled:opacity-50"
      )}
    />
  );
}
