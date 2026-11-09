import "server-only";
import Link from "next/link";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader, EmptyState } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { CreateLink } from "@/components/ui/buttons";
import { ShipmentsIcon } from "@/components/ui/icons";

export default async function ShipmentsPage() {
  const t = getTranslation;

  const shipments = await prisma.shipment.findMany({
    orderBy: { shipmentDate: "desc" },
    include: {
      sale: { include: { customer: true } },
    },
  });

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("nav.shipments")}
        description={t("shipments.title")}
        icon={<ShipmentsIcon className="h-5 w-5" />}
        action={<CreateLink href="/despachos/nuevo" label={t("shipments.create")} />}
      />

      {shipments.length === 0 ? (
        <EmptyState message={t("shipments.empty")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">{t("shipments.saleNumber")}</th>
                <th className="px-6 py-3 font-medium">{t("shipments.customer")}</th>
                <th className="px-6 py-3 font-medium">{t("shipments.date")}</th>
                <th className="px-6 py-3 font-medium">{t("shipments.carrier")}</th>
                <th className="px-6 py-3 font-medium">{t("shipments.trackingNumber")}</th>
                <th className="px-6 py-3 font-medium">{t("shipments.status")}</th>
                <th className="px-6 py-3 font-medium">{t("common.details")}</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr
                  key={shipment.id}
                  className="border-b border-border-default last:border-0 hover:bg-surface-secondary"
                >
                  <td className="px-6 py-3 font-mono text-xs font-medium text-text-main">
                    {shipment.sale.number}
                  </td>
                  <td className="px-6 py-3 text-text-main">{shipment.sale.customer.name}</td>
                  <td className="px-6 py-3 text-text-subtle">
                    {shipment.shipmentDate.toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-6 py-3 text-text-subtle">{shipment.carrier}</td>
                  <td className="px-6 py-3 text-text-subtle">
                    {shipment.trackingNumber ?? "—"}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge
                      status={shipment.status}
                      label={t(`shipments.${shipment.status.toLowerCase()}`)}
                    />
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/despachos/${shipment.id}`}
                      className="font-medium text-brand-600 hover:text-brand-700"
                    >
                      {t("common.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}