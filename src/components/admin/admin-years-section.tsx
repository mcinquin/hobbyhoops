"use client";

import { References } from "@/lib/types";
import { normYear } from "@/lib/reference-mutations";
import { AdminReferenceListSection } from "@/components/admin/admin-reference-list-section";

interface AdminYearsSectionProps {
  references: References;
  onReferencesChange: (references: References) => void;
}

export function AdminYearsSection({
  references,
  onReferencesChange,
}: AdminYearsSectionProps) {
  return (
    <AdminReferenceListSection
      onReferencesChange={onReferencesChange}
      introKey="admin.years.intro"
      unitInputId="admin-year-value"
      unitPlaceholderKey="admin.years.placeholder"
      filterPlaceholderKey="admin.years.filter"
      referencedKey="admin.years.referenced"
      shownKey="admin.years.shown"
      emptyKey="admin.years.noneFound"
      batchDescKey="admin.years.batchDescSpreadsheet"
      batchPlaceholderKey="admin.years.batchPlaceholder"
      unitRequiredKey="admin.years.valueRequired"
      addedKey="admin.years.added"
      items={references.years}
      validateUnit={(value) =>
        normYear(value) ? null : "admin.years.invalidFormat"
      }
      buildAddPatch={(year) => ({ action: "addYear", year })}
      buildBatchPatch={(years) => ({ action: "addYears", years })}
    />
  );
}
