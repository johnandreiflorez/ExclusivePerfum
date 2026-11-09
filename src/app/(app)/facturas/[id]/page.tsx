import "server-only";
import { notFound } from "next/navigation";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslation } from "@/lib/i18n";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/money";
import { SecondaryLink } from "@/components/ui/buttons";
import { effectiveInvoiceStatus, effectiveInstallmentStatus } from "@/lib/billing/status";
import { AnnulInvoiceButton } from "./annul-invoice-button";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "invoices.view")) redirect("/dashboard");

  const t = getTranslation;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      sale: true,
      customer: true,
      createdBy: true,
      installments: { orderBy: { number: "asc" } },
      allocations: {
        include: { payment: { include: { createdBy: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!invoice) notFound();

  const effective = effectiveInvoiceStatus(invoice);
  const balance = Number(invoice.total) - Number(invoice.paidAmount);

  const rows = [
    { label: t("invoices.sale"), value: invoice.sale.number },
    { label: t("invoices.issueDate"), value: invoice.issueDate.toLocaleDateString("es-CO") },
    { label: t("invoices.dueDate"), value: invoice.dueDate.toLocaleDateString("es-CO") },
    { label: t("invoices.subtotal"), value: formatCurrency(invoice.subtotal) },
    { label: t("invoices.discount"), value: formatCurrency(invoice.discount) },
    { label: t("invoices.tax"), value: formatCurrency(invoice.tax) },
    { label: t("invoices.shipping"), value: formatCurrency(invoice.shipping) },
    { label: t("invoices.insurance"), value: formatCurrency(invoice.insurance) },
    { label: t("invoices.total"), value: formatCurrency(invoice.total) },
    { label: t("invoices.paidAmount"), value: formatCurrency(invoice.paidAmount) },
    { label: t("invoices.balance"), value: formatCurrency(balance) },
  ];

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={invoice.number}
        description={`${invoice.customer.name} — ${t("invoices.invoiceFor")} ${invoice.sale.number}`}
        icon={
          <StatusBadge status={effective} label={t(`invoices.${effective.toLowerCase()}`)} />
        }
        action={
          <div className="flex gap-2">
            <Link
              href={`/ventas/${invoice.saleId}`}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              {t("invoices.sale")}: {invoice.sale.number}
            </Link>
            <SecondaryLink href="/facturas" label={t("common.back")} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-gap lg:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold text-text-main">{invoice.number}</h2>
          <dl className="mt-4 flex flex-col gap-2 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <dt className="text-text-subtle">{row.label}</dt>
                <dd className="text-right font-medium text-text-main">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 border-t border-border-default pt-4">
            <p className="text-sm text-text-subtle">
              {t("invoices.createdBy")}: {invoice.createdBy.name}
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-main">
              {t("invoices.installments")}
            </h2>
            {hasPermission(user, "invoices.manage") && effective !== "ANNULLED" ? (
              <AnnulInvoiceButton
                invoiceId={invoice.id}
                disabled={balance <= 0}
              />
            ) : null}
          </div>

          {invoice.installments.length === 0 ? (
            <p className="mt-2 text-sm text-text-faint">{t("common.optional")}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                    <th className="py-2 pr-4 font-medium">{t("invoices.installment")}</th>
                    <th className="py-2 pr-4 font-medium">{t("invoices.dueDate")}</th>
                    <th className="py-2 pr-4 font-medium">{t("invoices.planned")}</th>
                    <th className="py-2 pr-4 font-medium">{t("invoices.paidAmount")}</th>
                    <th className="py-2 pr-4 font-medium">{t("invoices.balance")}</th>
                    <th className="py-2 text-right font-medium">{t("invoices.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.installments.map((installment) => {
                    const st = effectiveInstallmentStatus(installment);
                    return (
                      <tr
                        key={installment.id}
                        className="border-b border-border-default last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium text-text-main">
                          {installment.number}
                        </td>
                        <td className="py-3 pr-4 text-text-subtle">
                          {installment.dueDate.toLocaleDateString("es-CO")}
                        </td>
                        <td className="py-3 pr-4 text-text-main">
                          {formatCurrency(installment.plannedAmount)}
                        </td>
                        <td className="py-3 pr-4 text-text-subtle">
                          {formatCurrency(installment.paidAmount)}
                        </td>
                        <td className="py-3 pr-4 text-text-main">
                          {formatCurrency(
                            Number(installment.plannedAmount) - Number(installment.paidAmount),
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <StatusBadge
                            status={st}
                            label={t(`invoices.${st.toLowerCase()}`)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 border-t border-border-default pt-4">
            <h2 className="text-lg font-semibold text-text-main">{t("invoices.payments")}</h2>
            {invoice.allocations.length === 0 ? (
              <p className="mt-2 text-sm text-text-faint">{t("invoices.noPayments")}</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {invoice.allocations.map((allocation) => (
                  <div
                    key={allocation.id}
                    className="flex items-center justify-between gap-4 rounded-md border border-border-default px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-text-main">
                        {allocation.payment.number}
                      </p>
                      <p className="text-xs text-text-faint">
                        {allocation.payment.paymentDate.toLocaleDateString("es-CO")} ·{" "}
                        {t(`payments.method_${allocation.payment.method}`)}
                        {allocation.payment.createdBy
                          ? ` · ${allocation.payment.createdBy.name}`
                          : ""}
                      </p>
                    </div>
                    <p className="font-medium text-text-main">
                      {formatCurrency(allocation.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}