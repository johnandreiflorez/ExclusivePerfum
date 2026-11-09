import "server-only";
import { notFound } from "next/navigation";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslation } from "@/lib/i18n";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { formatCurrency } from "@/lib/money";
import { SecondaryLink } from "@/components/ui/buttons";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "payments.view")) redirect("/dashboard");

  const t = getTranslation;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: true,
      allocations: {
        include: { invoice: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!payment) notFound();

  const rows = [
    { label: t("payments.customer"), value: payment.customer.name },
    { label: t("payments.date"), value: payment.paymentDate.toLocaleDateString("es-CO") },
    { label: t("payments.method"), value: t(`payments.method_${payment.method}`) },
    { label: t("payments.reference"), value: payment.reference ?? "—" },
    { label: t("payments.amount"), value: formatCurrency(payment.amount) },
    { label: t("payments.createdBy"), value: payment.createdBy.name },
  ];

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={payment.number}
        description={payment.customer.name}
        action={<SecondaryLink href="/pagos" label={t("common.back")} />}
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
            {t("payments.allocations")}
          </h2>
          <div className="mt-4 flex flex-col gap-2">
            {payment.allocations.map((allocation) => (
              <div
                key={allocation.id}
                className="flex items-center justify-between gap-4 rounded-md border border-border-default px-3 py-2 text-sm"
              >
                <Link
                  href={`/facturas/${allocation.invoiceId}`}
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  {allocation.invoice.number}
                </Link>
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