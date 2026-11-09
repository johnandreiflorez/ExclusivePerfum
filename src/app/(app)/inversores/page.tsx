import "server-only";
import Link from "next/link";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader, EmptyState } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/money";
import { CreateLink } from "@/components/ui/buttons";
import { InvestorIcon } from "@/components/ui/icons";
import {
  investmentBalance,
  capitalUtilizado,
} from "@/lib/investor/calculations";

export default async function InvestorsPage() {
  const t = getTranslation;

  const investors = await prisma.investor.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      investments: true,
      participations: {
        include: { sale: { select: { status: true } } },
      },
    },
  });

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("nav.investors")}
        description={t("investors.title")}
        icon={<InvestorIcon className="h-5 w-5" />}
        action={<CreateLink href="/inversores/nuevo" label={t("investors.create")} />}
      />

      {investors.length === 0 ? (
        <EmptyState message={t("investors.empty")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">{t("investors.name")}</th>
                <th className="px-6 py-3 font-medium">{t("investors.aportes")}</th>
                <th className="px-6 py-3 font-medium">{t("investors.retiros")}</th>
                <th className="px-6 py-3 font-medium">{t("investors.capital")}</th>
                <th className="px-6 py-3 font-medium">{t("investors.capitalUtilizado")}</th>
                <th className="px-6 py-3 font-medium">{t("investors.entryDate")}</th>
                <th className="px-6 py-3 font-medium">{t("investors.status")}</th>
                <th className="px-6 py-3 font-medium">{t("common.details")}</th>
              </tr>
            </thead>
            <tbody>
              {investors.map((investor) => {
                const balance = investmentBalance(investor.investments);
                const used = capitalUtilizado(
                  investor.participations
                    .filter((p) => p.sale.status !== "CANCELLED")
                    .map((p) => ({ amount: p.amount })),
                );
                return (
                  <tr
                    key={investor.id}
                    className="border-b border-border-default last:border-0 hover:bg-surface-secondary"
                  >
                    <td className="px-6 py-3 font-medium text-text-main">
                      {investor.name}
                    </td>
                    <td className="px-6 py-3 text-text-main">
                      {formatCurrency(balance.aportes)}
                    </td>
                    <td className="px-6 py-3 text-text-subtle">
                      {formatCurrency(balance.retiros)}
                    </td>
                    <td className="px-6 py-3 text-text-main">
                      {formatCurrency(balance.saldo)}
                    </td>
                    <td className="px-6 py-3 text-text-subtle">
                      {formatCurrency(used)}
                    </td>
                    <td className="px-6 py-3 text-text-subtle">
                      {investor.entryDate.toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge
                        status={investor.status}
                        label={t(`investors.${investor.status.toLowerCase()}`)}
                      />
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/inversores/${investor.id}`}
                        className="font-medium text-brand-600 hover:text-brand-700"
                      >
                        {t("common.view")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}