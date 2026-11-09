import "server-only";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/money";
import { SecondaryLink } from "@/components/ui/buttons";
import { SaleStatusActions } from "./sale-status-actions";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = getTranslation;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      costs: true,
      createdBy: true,
      shipments: true,
      investors: { include: { investor: true } },
    },
  });

  if (!sale) notFound();

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={sale.number}
        description={`${sale.customer.name} — ${sale.saleDate.toLocaleDateString("es-CO")}`}
        action={
          <div className="flex gap-2">
            <SecondaryLink href="/ventas" label={t("common.back")} />
            {sale.createdBy ? (
              <span className="inline-flex items-center rounded-lg border border-border-default bg-surface-primary px-4 py-2 text-sm font-medium text-text-subtle shadow-card">
                {t("sales.createdBy")}: {sale.createdBy.name}
              </span>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-gap lg:grid-cols-4">
        <Card>
          <p className="text-sm text-text-subtle">{t("sales.subtotal")}</p>
          <p className="mt-2 text-2xl font-bold text-text-main">
            {formatCurrency(sale.subtotal)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-subtle">{t("sales.totalCost")}</p>
          <p className="mt-2 text-2xl font-bold text-text-main">
            {formatCurrency(sale.totalCost)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-subtle">{t("sales.profit")}</p>
          <p className="mt-2 text-2xl font-bold text-brand-700">
            {formatCurrency(sale.profit)}
          </p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-subtle">{t("sales.margin")}</p>
            <StatusBadge
              status={sale.status}
              label={t(`sales.${sale.status.toLowerCase()}`)}
            />
          </div>
          <p className="mt-2 text-2xl font-bold text-text-main">
            {sale.margin.toString()}%
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-gap lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-text-main">{t("sales.items")}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="py-2 pr-4 font-medium">{t("sales.product")}</th>
                  <th className="py-2 pr-4 font-medium">{t("sales.quantity")}</th>
                  <th className="py-2 pr-4 font-medium">{t("sales.unitCost")}</th>
                  <th className="py-2 pr-4 font-medium">{t("sales.unitPrice")}</th>
                  <th className="py-2 pr-4 font-medium">{t("sales.discount")}</th>
                  <th className="py-2 text-right font-medium">{t("sales.itemSubtotal")}</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id} className="border-b border-border-default last:border-0">
                    <td className="py-3 pr-4 font-medium text-text-main">{item.productName}</td>
                    <td className="py-3 pr-4 text-text-subtle">{item.quantity}</td>
                    <td className="py-3 pr-4 text-text-subtle">{formatCurrency(item.unitCost)}</td>
                    <td className="py-3 pr-4 text-text-subtle">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 pr-4 text-text-subtle">{formatCurrency(item.discount)}</td>
                    <td className="py-3 text-right font-medium text-text-main">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-text-main">{t("sales.costs")}</h2>
          {sale.costs.length === 0 ? (
            <p className="mt-2 text-sm text-text-faint">{t("common.optional")}</p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {sale.costs.map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border-default px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-text-faint">
                      {t(`sales.costType_${cost.type}`)}
                    </p>
                    {cost.description ? (
                      <p className="truncate text-text-subtle">{cost.description}</p>
                    ) : null}
                  </div>
                  <p className="font-medium text-text-main">{formatCurrency(cost.amount)}</p>
                </div>
              ))}
            </div>
          )}

          {sale.observations ? (
            <div className="mt-4 border-t border-border-default pt-4">
              <h3 className="text-sm font-semibold text-text-main">{t("sales.observations")}</h3>
              <p className="mt-1 text-sm text-text-subtle">{sale.observations}</p>
            </div>
          ) : null}

          {sale.shipments.length > 0 ? (
            <div className="mt-4 border-t border-border-default pt-4">
              <h3 className="text-sm font-semibold text-text-main">{t("nav.shipments")}</h3>
              <div className="mt-2 flex flex-col gap-2">
                {sale.shipments.map((shipment) => (
                  <Link
                    key={shipment.id}
                    href={`/despachos/${shipment.id}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border-default px-3 py-2 text-sm transition-colors hover:bg-surface-secondary"
                  >
                    <span className="text-text-subtle">{shipment.carrier}</span>
                    <StatusBadge
                      status={shipment.status}
                      label={t(`shipments.${shipment.status.toLowerCase()}`)}
                    />
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 border-t border-border-default pt-4">
            <SaleStatusActions saleId={sale.id} status={sale.status} />
          </div>
        </Card>
      </div>

      {sale.investors.length > 0 ? (
        <Card>
          <h2 className="text-lg font-semibold text-text-main">{t("sales.investors")}</h2>
          <p className="mt-0.5 text-sm text-text-subtle">
            <span className="font-medium text-text-main">100%</span> —{" "}
            {t("sales.participationOk")}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="py-2 pr-4 font-medium">{t("sales.investor")}</th>
                  <th className="py-2 pr-4 font-medium">{t("sales.investorAmount")}</th>
                  <th className="py-2 text-right font-medium">{t("sales.investorPercentage")}</th>
                </tr>
              </thead>
              <tbody>
                {sale.investors.map((participation) => (
                  <tr key={participation.id} className="border-b border-border-default last:border-0">
                    <td className="py-3 pr-4 font-medium text-text-main">
                      <Link
                        href={`/inversores/${participation.investorId}`}
                        className="transition-colors hover:text-brand-700"
                      >
                        {participation.investor.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-text-subtle">
                      {formatCurrency(participation.amount)}
                    </td>
                    <td className="py-3 text-right font-medium text-text-main">
                      {participation.percentage.toString()}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}