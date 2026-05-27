"use client";

import { References } from "@/lib/types";
import { AdminReferenceListSection } from "@/components/admin/admin-reference-list-section";

interface AdminPlayersSectionProps {
  references: References;
  onReferencesChange: (references: References) => void;
}

export function AdminPlayersSection({
  references,
  onReferencesChange,
}: AdminPlayersSectionProps) {
  return (
    <AdminReferenceListSection
      onReferencesChange={onReferencesChange}
      introKey="admin.players.intro"
      unitInputId="admin-player-name"
      unitPlaceholderKey="admin.players.placeholder"
      filterPlaceholderKey="admin.players.filter"
      referencedKey="admin.players.referenced"
      shownKey="admin.players.shown"
      emptyKey="admin.players.noneFound"
      batchDescKey="admin.players.batchDescSpreadsheet"
      batchPlaceholderKey="admin.players.batchPlaceholder"
      unitRequiredKey="admin.players.nameRequired"
      addedKey="admin.players.added"
      deletedKey="admin.players.deleted"
      items={references.players}
      deletable
      listLayout="filterable"
      buildAddPatch={(player) => ({ action: "addPlayer", player })}
      buildBatchPatch={(players) => ({ action: "addPlayers", players })}
      buildRemovePatch={(player) => ({ action: "removePlayer", player })}
    />
  );
}
