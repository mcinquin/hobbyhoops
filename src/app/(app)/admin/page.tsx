import { AdminWorkspace } from "@/components/admin/admin-workspace";
import {
  COLLECTION_MAX_PAGE_SIZE,
  getCollectionPage,
  getReferences,
} from "@/lib/data";

export default async function AdminPage() {
  const { cards, totalCount } = getCollectionPage({
    search: "",
    player: "",
    team: "",
    year: "",
    brand: "",
    set: "",
    variation: "",
    tags: [],
    page: 1,
    pageSize: COLLECTION_MAX_PAGE_SIZE,
    sort: "player",
    sortDesc: false,
  });
  const references = getReferences();

  return (
    <AdminWorkspace
      initialCards={cards}
      totalCardCount={totalCount}
      initialReferences={references}
    />
  );
}
