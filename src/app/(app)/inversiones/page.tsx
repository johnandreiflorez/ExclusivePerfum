import "server-only";
import Link from "next/link";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader, EmptyState, StatCard } from "@/components/ui/layout";
import { formatCurrency } from "@/lib/money";
import { CreateLink } from "@/components/ui/buttons";
import { InvestmentsIcon } from "@/components/ui/icons";
import { Prisma } from "@/generated/prisma/client";
import { investmentBalance } from "@/lib/investor/calculations";

export default async function InvestmentsPage() {
  const t = getTranslation;

  const [investments, investors] = await Promise.all([
    prisma.investment.findMany({
      orderBy: { investmentDate: "desc" },
      include: { investor: true, createdBy: true },
    }),
    prisma.investor.findMany({
      include: { investments: true },
    }),
  ]);

  const zero = new Prisma.Decimal(0);
  let totalAportes = zero;
  let totalRetiros = zero;
  let totalSaldo = zero;
  for (const investor of investors) {
    const balance = investmentBalance(investor.investments);
    totalAportes = totalAportes.plus(balance.aportes);
    totalRetiros = totalRetiros.plus(balance.retiros);
    totalSaldo = totalSaldo.plus(balance.saldo);
  }

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("nav.investments")}
        description={t("investments.title")}
        icon={<InvestmentsIcon className="h-5 w-5" />}
        action={<CreateLink href="/inversiones/nueva" label={t("investments.create")} />}
      />

      <div className="grid grid-cols-1 gap-gap sm:grid-cols-3">
        <StatCard
          label={t("investors.aportes")}
          value={formatCurrency(totalAportes)}
          tone="brand"
        />
        <StatCard
          label={t("investors.retiros")}
          value={formatCurrency(totalRetiros)}
          tone="danger"
        />
        <StatCard
          label={t("investments.saldoLabel")}
          value={formatCurrency(totalSaldo)}
        />
      </div>

      {investments.length === 0 ? (
        <EmptyState message={t("investments.empty")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">{t("investments.investor")}</th>
                <th className="px-6 py-3 font-medium">{t("investments.date")}</th>
                <th className="px-6 py-3 font-medium">{t("investments.type")}</th>
                <th className="px-6 py-3 font-medium">{t("investments.amount")}</th>
                <th className="px-6 py-3 font-medium">{t("investments.reference")}</th>
                <th className="px-6 py-3 font-medium">{t("investments.createdBy")}</th>
                <th className="px-6 py-3 font-medium">{t("common.details")}</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((movement) => (
                <tr
                  key={movement.id}
                  className="border-b border-border-default last:border-0 hover:bg-surface-secondary"
                >
                  <td className="px-6 py-3">
                    <Link
                      href={`/inversores/${movement.investorId}`}
                      className="font-medium text-brand-600 hover:text-brand-700"
                    >
                      {movement.investor.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-text-subtle">
                    {movement.investmentDate.toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-6 py-3">
                    <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-medium text-text-main">
                      {t(`investments.type_${movement.type}`)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-text-main">
                    {formatCurrency(movement.amount)}
                  </td>
                  <td className="px-6 py-3 text-text-subtle">{movement.reference ?? "—"}</td>
                  <td className="px-6 py-3 text-text-subtle">{movement.createdBy.name}</td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/inversores/${movement.investorId}`}
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