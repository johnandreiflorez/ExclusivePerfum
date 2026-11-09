import "server-only";
import Link from "next/link";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader, EmptyState } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/money";
import { CreateLink } from "@/components/ui/buttons";
import { SalesIcon } from "@/components/ui/icons";

export default async function SalesPage() {
  const t = getTranslation;

  const sales = await prisma.sale.findMany({
    orderBy: { saleDate: "desc" },
    include: { customer: true },
  });

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("nav.sales")}
        description={t("sales.title")}
        icon={<SalesIcon className="h-5 w-5" />}
        action={<CreateLink href="/ventas/nueva" label={t("sales.create")} />}
      />

      {sales.length === 0 ? (
        <EmptyState message={t("sales.empty")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">{t("sales.number")}</th>
                <th className="px-6 py-3 font-medium">{t("sales.customer")}</th>
                <th className="px-6 py-3 font-medium">{t("sales.date")}</th>
                <th className="px-6 py-3 font-medium">{t("sales.subtotal")}</th>
                <th className="px-6 py-3 font-medium">{t("sales.profit")}</th>
                <th className="px-6 py-3 font-medium">{t("sales.status")}</th>
                <th className="px-6 py-3 font-medium">{t("common.details")}</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-border-default last:border-0 hover:bg-surface-secondary"
                >
                  <td className="px-6 py-3 font-mono text-xs font-medium text-text-main">
                    {sale.number}
                  </td>
                  <td className="px-6 py-3 text-text-main">{sale.customer.name}</td>
                  <td className="px-6 py-3 text-text-subtle">
                    {sale.saleDate.toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-6 py-3 text-text-main">
                    {formatCurrency(sale.subtotal)}
                  </td>
                  <td className="px-6 py-3 text-text-subtle">
                    {formatCurrency(sale.profit)}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge
                      status={sale.status}
                      label={t(`sales.${sale.status.toLowerCase()}`)}
                    />
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/ventas/${sale.id}`}
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