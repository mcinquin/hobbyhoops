import { ShipmentBoard } from "@/components/shipments/shipment-board";
import { PageHeader } from "@/components/page-header";
import { getShipments, getReferences } from "@/lib/data";
import { getTranslations } from "@/i18n/server";

export default async function ShipmentsPage() {
  const [shipments, references] = await Promise.all([
    Promise.resolve(getShipments(true)),
    Promise.resolve(getReferences()),
  ]);
  const { t } = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("shipments.title")}
        subtitle={t("shipments.subtitle")}
      />
      <ShipmentBoard initialShipments={shipments} references={references} />
    </div>
  );
}
