import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getCollectionStats, getReferences } from "@/lib/data";

export default async function AdminPage() {
  const references = getReferences();
  const stats = getCollectionStats();

  return (
    <AdminWorkspace
      initialReferences={references}
      totalCardCount={stats.total}
    />
  );
}
