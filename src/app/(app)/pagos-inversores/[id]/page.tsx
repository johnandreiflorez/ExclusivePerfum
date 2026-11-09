import "server-only";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { formatCurrency } from "@/lib/money";
import { SecondaryLink } from "@/components/ui/buttons";
import Link from "next/link";

export default async function InvestorPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "profits.view")) redirect("/dashboard");

  const t = getTranslation;

  const payment = await prisma.investorPayment.findUnique({
    where: { id },
    include: {
      investor: true,
      createdBy: true,
      allocations: {
        include: {
          profitDistribution: {
            include: {
              saleInvestor: { include: { sale: true } },
              invoice: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!payment) notFound();

  const rows = [
    { label: t("investorPayments.investor"), value: payment.investor.name },
    { label: t("investorPayments.date"), value: payment.paymentDate.toLocaleDateString("es-CO") },
    { label: t("investorPayments.method"), value: t(`investorPayments.method_${payment.method}`) },
    { label: t("investorPayments.reference"), value: payment.reference ?? "—" },
    { label: t("investorPayments.amount"), value: formatCurrency(payment.amount) },
    { label: t("investorPayments.createdBy"), value: payment.createdBy.name },
  ];

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={payment.number}
        description={payment.investor.name}
        action={<SecondaryLink href="/pagos-inversores" label={t("common.back")} />}
      />

      <div className="grid grid-cols-1 gap-gap lg:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold text-text-main">{payment.number}</h2>
          <dl className="mt-4 flex flex-col gap-2 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <dt className="text-text-subtle">{row.label}</dt>
                <dd className="text-right font-medium text-text-main">{row.value}</dd>
              </div>
            ))}
          </dl>
          {payment.observations ? (
            <p className="mt-4 border-t border-border-default pt-4 text-sm text-text-subtle">
              {payment.observations}
            </p>
          ) : null}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-text-main">
            {t("investorPayments.allocations")}
          </h2>
          <div className="mt-4 flex flex-col gap-2">
            {payment.allocations.map((allocation) => (
              <div
                key={allocation.id}
                className="flex items-center justify-between gap-4 rounded-md border border-border-default px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/ventas/${allocation.profitDistribution.saleInvestor.saleId}`}
                    className="font-mono text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    {allocation.profitDistribution.saleInvestor.sale.number}
                  </Link>
                  <p className="truncate text-xs text-text-faint">
                    {t("profits.invoice")}:{" "}
                    <Link
                      href={`/facturas/${allocation.profitDistribution.invoiceId}`}
                      className="hover:text-brand-700"
                    >
                      {allocation.profitDistribution.invoice.number}
                    </Link>
                  </p>
                </div>
                <p className="font-medium text-text-main">
                  {formatCurrency(allocation.amount)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}