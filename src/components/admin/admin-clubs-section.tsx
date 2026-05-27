"use client";

import { References } from "@/lib/types";
import { AdminReferenceListSection } from "@/components/admin/admin-reference-list-section";

interface AdminClubsSectionProps {
  references: References;
  onReferencesChange: (references: References) => void;
}

export function AdminClubsSection({
  references,
  onReferencesChange,
}: AdminClubsSectionProps) {
  return (
    <AdminReferenceListSection
      onReferencesChange={onReferencesChange}
      introKey="admin.clubs.intro"
      unitInputId="admin-club-name"
      unitPlaceholderKey="admin.clubs.placeholder"
      filterPlaceholderKey="admin.clubs.filter"
      referencedKey="admin.clubs.referenced"
      shownKey="admin.clubs.shown"
      emptyKey="admin.clubs.noneFound"
      batchDescKey="admin.clubs.batchDescSpreadsheet"
      batchPlaceholderKey="admin.clubs.batchPlaceholder"
      unitRequiredKey="admin.clubs.nameRequired"
      addedKey="admin.clubs.added"
      deletedKey="admin.clubs.deleted"
      items={references.teams}
      deletable
      buildAddPatch={(team) => ({ action: "addTeam", team })}
      buildBatchPatch={(teams) => ({ action: "addTeams", teams })}
      buildRemovePatch={(team) => ({ action: "removeTeam", team })}
    />
  );
}
