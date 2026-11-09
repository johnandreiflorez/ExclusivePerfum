import "server-only";
import Link from "next/link";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader, EmptyState } from "@/components/ui/layout";
import { formatCurrency } from "@/lib/money";
import { CreateLink } from "@/components/ui/buttons";
import { InvestorPaymentsIcon } from "@/components/ui/icons";

export default async function InvestorPaymentsPage() {
  const t = getTranslation;

  const payments = await prisma.investorPayment.findMany({
    orderBy: { paymentDate: "desc" },
    include: { investor: true },
  });

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("nav.investorPayments")}
        description={t("investorPayments.title")}
        icon={<InvestorPaymentsIcon className="h-5 w-5" />}
        action={
          <CreateLink href="/pagos-inversores/nuevo" label={t("investorPayments.create")} />
        }
      />

      {payments.length === 0 ? (
        <EmptyState message={t("investorPayments.empty")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">{t("investorPayments.number")}</th>
                <th className="px-6 py-3 font-medium">{t("investorPayments.investor")}</th>
                <th className="px-6 py-3 font-medium">{t("investorPayments.date")}</th>
                <th className="px-6 py-3 font-medium">{t("investorPayments.amount")}</th>
                <th className="px-6 py-3 font-medium">{t("investorPayments.method")}</th>
                <th className="px-6 py-3 font-medium">{t("common.details")}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-border-default last:border-0 hover:bg-surface-secondary"
                >
                  <td className="px-6 py-3 font-mono text-xs font-medium text-text-main">
                    {payment.number}
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/inversores/${payment.investorId}`}
                      className="font-medium text-brand-600 hover:text-brand-700"
                    >
                      {payment.investor.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-text-subtle">
                    {payment.paymentDate.toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-6 py-3 text-text-main">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-3 text-text-subtle">
                    {t(`investorPayments.method_${payment.method}`)}
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/pagos-inversores/${payment.id}`}
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