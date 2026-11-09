import "server-only";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/money";
import { SecondaryLink } from "@/components/ui/buttons";
import { ShipmentStatusActions } from "./shipment-status-actions";

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = getTranslation;

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      sale: { include: { customer: true } },
    },
  });

  if (!shipment) notFound();

  const rows = [
    { label: t("shipments.date"), value: shipment.shipmentDate.toLocaleDateString("es-CO") },
    { label: t("shipments.carrier"), value: shipment.carrier },
    { label: t("shipments.trackingNumber"), value: shipment.trackingNumber ?? "—" },
    { label: t("shipments.shippingCost"), value: formatCurrency(shipment.shippingCost) },
    { label: t("shipments.insurance"), value: formatCurrency(shipment.insurance) },
    {
      label: t("shipments.estimatedDeliveryDate"),
      value: shipment.estimatedDeliveryDate
        ? shipment.estimatedDeliveryDate.toLocaleDateString("es-CO")
        : "—",
    },
    {
      label: t("shipments.deliveredDate"),
      value: shipment.deliveredDate
        ? shipment.deliveredDate.toLocaleDateString("es-CO")
        : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={`${shipment.sale.number} — ${shipment.sale.customer.name}`}
        description={shipment.carrier}
        action={
          <SecondaryLink href="/despachos" label={t("common.back")} />
        }
      />

      <div className="grid grid-cols-1 gap-gap lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-main">{shipment.carrier}</h2>
            <StatusBadge
              status={shipment.status}
              label={t(`shipments.${shipment.status.toLowerCase()}`)}
            />
          </div>
          <dl className="mt-4 flex flex-col gap-2 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <dt className="text-text-subtle">{row.label}</dt>
                <dd className="text-right font-medium text-text-main">{row.value}</dd>
              </div>
            ))}
          </dl>
          {shipment.details ? (
            <>
              <h3 className="mt-6 text-sm font-semibold text-text-main">
                {t("shipments.details")}
              </h3>
              <p className="mt-1 text-sm text-text-subtle">{shipment.details}</p>
            </>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-text-main">{t("shipments.updateStatus")}</h2>
          <div className="mt-4">
            <ShipmentStatusActions
              shipmentId={shipment.id}
              currentStatus={shipment.status}
            />
          </div>
          <div className="mt-6 border-t border-border-default pt-4">
            <Link
              href={`/ventas/${shipment.saleId}`}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              {t("sales.details")}: {shipment.sale.number}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}