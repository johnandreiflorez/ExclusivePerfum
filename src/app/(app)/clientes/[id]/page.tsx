import "server-only";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, toNumber } from "@/lib/money";
import { SecondaryLink } from "@/components/ui/buttons";
import { effectiveInvoiceStatus } from "@/lib/billing/status";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = getTranslation;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        orderBy: { saleDate: "desc" },
        include: {
          items: true,
        },
      },
      invoices: {
        orderBy: { issueDate: "desc" },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!customer) notFound();

  const totalSalesValue = customer.sales
    .filter((s) => s.status !== "CANCELLED")
    .reduce((acc, s) => acc + toNumber(s.subtotal), 0);

  const activeInvoices = customer.invoices
    .map((inv) => ({ inv, effective: effectiveInvoiceStatus(inv) }))
    .filter(({ effective }) => effective !== "ANNULLED");

  const outstandingBalance = activeInvoices.reduce(
    (acc, { inv }) => acc + (toNumber(inv.total) - toNumber(inv.paidAmount)),
    0,
  );

  const totalPaid = customer.payments.reduce(
    (acc, p) => acc + toNumber(p.amount),
    0,
  );

  const infoRows = [
    { label: t("customers.documentType"), value: t(`customers.${customer.documentType.toLowerCase()}`) },
    { label: t("customers.documentNumber"), value: customer.documentNumber },
    { label: t("customers.phone"), value: customer.phone ?? "—" },
    { label: t("customers.email"), value: customer.email ?? "—" },
    { label: t("customers.address"), value: customer.address ?? "—" },
    { label: t("customers.city"), value: [customer.city, customer.department].filter(Boolean).join(", ") || "—" },
  ];

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={customer.name}
        description={`${infoRows[1].label}: ${infoRows[1].value}`}
        action={
          <SecondaryLink href="/clientes" label={t("common.back")} />
        }
      />

      <div className="grid grid-cols-1 gap-gap sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-text-subtle">{t("customers.totalInvoiced")}</p>
          <p className="mt-2 text-2xl font-bold text-text-main">
            {formatCurrency(totalSalesValue)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-subtle">{t("customers.totalPaid")}</p>
          <p className="mt-2 text-2xl font-bold text-text-main">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-subtle">{t("customers.outstandingBalance")}</p>
          <p className="mt-2 text-2xl font-bold text-text-main">
            {formatCurrency(outstandingBalance)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-subtle">{t("customers.status")}</p>
          <div className="mt-2">
            <StatusBadge
              status={customer.status}
              label={t(`customers.${customer.status.toLowerCase()}`)}
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-gap lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-text-main">{t("customers.observations")}</h2>
          <p className="mt-2 text-sm text-text-subtle">
            {customer.observations || "—"}
          </p>
          <dl className="mt-4 flex flex-col gap-2 text-sm">
            {infoRows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <dt className="text-text-subtle">{row.label}</dt>
                <dd className="text-right font-medium text-text-main">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-text-main">{t("customers.salesHistory")}</h2>
          {customer.sales.length === 0 ? (
            <p className="mt-2 text-sm text-text-subtle">{t("customers.noHistory")}</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {customer.sales.map((sale) => (
                <Link
                  key={sale.id}
                  href={`/ventas/${sale.id}`}
                  className="flex items-center justify-between gap-4 rounded-md border border-border-default px-3 py-2 transition-colors hover:bg-surface-secondary"
                >
                  <div>
                    <p className="text-sm font-medium text-text-main">{sale.number}</p>
                    <p className="text-xs text-text-faint">
                      {sale.saleDate.toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge
                      status={sale.status}
                      label={t(`sales.${sale.status.toLowerCase()}`)}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-gap lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-text-main">{t("customers.history")}</h2>
          {customer.invoices.length === 0 ? (
            <p className="mt-2 text-sm text-text-subtle">{t("customers.noHistory")}</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {customer.invoices.map((invoice) => {
                const effective = effectiveInvoiceStatus(invoice);
                return (
                  <Link
                    key={invoice.id}
                    href={`/facturas/${invoice.id}`}
                    className="flex items-center justify-between gap-4 rounded-md border border-border-default px-3 py-2 transition-colors hover:bg-surface-secondary"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-main">{invoice.number}</p>
                      <p className="text-xs text-text-faint">
                        {t("invoices.balance")}: {formatCurrency(toNumber(invoice.total) - toNumber(invoice.paidAmount))}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge
                        status={effective}
                        label={t(`invoices.${effective.toLowerCase()}`)}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-text-main">{t("customers.paymentHistory")}</h2>
          {customer.payments.length === 0 ? (
            <p className="mt-2 text-sm text-text-subtle">{t("customers.noHistory")}</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {customer.payments.map((payment) => (
                <Link
                  key={payment.id}
                  href={`/pagos/${payment.id}`}
                  className="flex items-center justify-between gap-4 rounded-md border border-border-default px-3 py-2 transition-colors hover:bg-surface-secondary"
                >
                  <div>
                    <p className="text-sm font-medium text-text-main">{payment.number}</p>
                    <p className="text-xs text-text-faint">
                      {payment.paymentDate.toLocaleDateString("es-CO")} ·{" "}
                      {t(`payments.method_${payment.method}`)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-text-main">{formatCurrency(toNumber(payment.amount))}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}