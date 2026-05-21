import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getCollection, getReferences } from "@/lib/data";

export default async function AdminPage() {
  const cards = getCollection();
  const references = getReferences();

  return (
    <AdminWorkspace initialCards={cards} initialReferences={references} />
  );
}
