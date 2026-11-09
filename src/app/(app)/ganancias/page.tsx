import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader, EmptyState, StatCard } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/money";
import { ProfitIcon } from "@/components/ui/icons";
import { Prisma } from "@/generated/prisma/client";
import { availableForPayout } from "@/lib/investor/calculations";
import { InvestorFilterSelect } from "./investor-filter";

export default async function ProfitsPage({
  searchParams,
}: {
  searchParams: Promise<{ inversor?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "profits.view")) redirect("/dashboard");

  const { inversor } = await searchParams;
  const t = getTranslation;

  const [distributions, investors] = await Promise.all([
    prisma.profitDistribution.findMany({
      orderBy: { generatedAt: "desc" },
      where: inversor ? { investorId: inversor } : undefined,
      include: {
        investor: true,
        saleInvestor: { include: { sale: true } },
        invoice: true,
      },
    }),
    prisma.investor.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
  ]);

  const zero = new Prisma.Decimal(0);
  const nonAnnulled = distributions.filter((d) => d.status !== "ANULADA");
  const expectedTotal = nonAnnulled.reduce(
    (acc, d) => acc.plus(d.expectedAmount),
    zero,
  );
  const pendingTotal = nonAnnulled.reduce(
    (acc, d) => acc.plus(availableForPayout(d)),
    zero,
  );
  const paidTotal = nonAnnulled.reduce(
    (acc, d) => acc.plus(d.paidAmount),
    zero,
  );

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("nav.profits")}
        description={t("profits.title")}
        icon={<ProfitIcon className="h-5 w-5" />}
        action={
          <InvestorFilterSelect
            current={inversor}
            investors={investors.map((i) => ({ id: i.id, name: i.name }))}
          />
        }
      />

      <div className="grid grid-cols-1 gap-gap sm:grid-cols-3">
        <StatCard
          label={t("profits.expectedTotal")}
          value={formatCurrency(expectedTotal)}
          tone="brand"
        />
        <StatCard
          label={t("profits.pendingTotal")}
          value={formatCurrency(pendingTotal)}
          tone="warning"
        />
        <StatCard
          label={t("profits.paidTotal")}
          value={formatCurrency(paidTotal)}
          tone="success"
        />
      </div>

      {distributions.length === 0 ? (
        <EmptyState message={t("profits.empty")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">{t("profits.investor")}</th>
                <th className="px-6 py-3 font-medium">{t("profits.sale")}</th>
                <th className="px-6 py-3 font-medium">{t("profits.invoice")}</th>
                <th className="px-6 py-3 font-medium">{t("profits.expected")}</th>
                <th className="px-6 py-3 font-medium">{t("profits.recognized")}</th>
                <th className="px-6 py-3 font-medium">{t("profits.paid")}</th>
                <th className="px-6 py-3 font-medium">{t("profits.available")}</th>
                <th className="px-6 py-3 font-medium">{t("profits.status")}</th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((distribution) => (
                <tr
                  key={distribution.id}
                  className="border-b border-border-default last:border-0 hover:bg-surface-secondary"
                >
                  <td className="px-6 py-3">
                    <Link
                      href={`/inversores/${distribution.investorId}`}
                      className="font-medium text-brand-600 hover:text-brand-700"
                    >
                      {distribution.investor.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/ventas/${distribution.saleInvestor.saleId}`}
                      className="font-mono text-xs text-text-main hover:text-brand-700"
                    >
                      {distribution.saleInvestor.sale.number}
                    </Link>
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/facturas/${distribution.invoiceId}`}
                      className="font-mono text-xs text-text-main hover:text-brand-700"
                    >
                      {distribution.invoice.number}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-text-main">
                    {formatCurrency(distribution.expectedAmount)}
                  </td>
                  <td className="px-6 py-3 text-text-subtle">
                    {formatCurrency(distribution.recognizedAmount)}
                  </td>
                  <td className="px-6 py-3 text-text-subtle">
                    {formatCurrency(distribution.paidAmount)}
                  </td>
                  <td className="px-6 py-3 text-text-main">
                    {formatCurrency(availableForPayout(distribution))}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge
                      status={distribution.status}
                      label={t(`profits.status_${distribution.status}`)}
                    />
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