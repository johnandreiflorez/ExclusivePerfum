import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { ShipmentForm } from "../shipment-form";

export default async function NewShipmentPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "shipments.manage")) redirect("/despachos");

  const t = getTranslation;

  const sales = await prisma.sale.findMany({
    where: { status: { in: ["CONFIRMED", "DRAFT"] } },
    orderBy: { saleDate: "desc" },
    include: { customer: true },
  });

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("shipments.create")}
        description={t("shipments.title")}
      />
      <Card>
        {sales.length === 0 ? (
          <p className="text-sm text-text-faint">{t("shipments.noAvailableSales")}</p>
        ) : (
          <ShipmentForm
            sales={sales.map((s) => ({
              id: s.id,
              number: s.number,
              customerName: s.customer.name,
            }))}
          />
        )}
      </Card>
    </div>
  );
}