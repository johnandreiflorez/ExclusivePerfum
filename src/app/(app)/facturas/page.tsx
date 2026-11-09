import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslation } from "@/lib/i18n";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader, EmptyState } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/money";
import { CreateLink } from "@/components/ui/buttons";
import { InvoiceIcon } from "@/components/ui/icons";
import { effectiveInvoiceStatus } from "@/lib/billing/status";

export default async function InvoicesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "invoices.view")) redirect("/dashboard");

  const t = getTranslation;

  const invoices = await prisma.invoice.findMany({
    orderBy: { issueDate: "desc" },
    include: {
      sale: true,
      customer: true,
    },
  });

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("nav.invoices")}
        description={t("invoices.title")}
        icon={<InvoiceIcon className="h-5 w-5" />}
        action={
          hasPermission(user, "invoices.manage") ? (
            <CreateLink href="/facturas/nueva" label={t("invoices.create")} />
          ) : undefined
        }
      />

      {invoices.length === 0 ? (
        <EmptyState message={t("invoices.empty")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">{t("invoices.number")}</th>
                <th className="px-6 py-3 font-medium">{t("invoices.sale")}</th>
                <th className="px-6 py-3 font-medium">{t("invoices.customer")}</th>
                <th className="px-6 py-3 font-medium">{t("invoices.dueDate")}</th>
                <th className="px-6 py-3 font-medium">{t("invoices.total")}</th>
                <th className="px-6 py-3 font-medium">{t("invoices.paidAmount")}</th>
                <th className="px-6 py-3 font-medium">{t("invoices.balance")}</th>
                <th className="px-6 py-3 font-medium">{t("invoices.status")}</th>
                <th className="px-6 py-3 font-medium">{t("common.details")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const effective = effectiveInvoiceStatus(invoice);
                return (
                  <tr
                    key={invoice.id}
                    className="border-b border-border-default last:border-0 hover:bg-surface-secondary"
                  >
                    <td className="px-6 py-3 font-mono text-xs font-medium text-text-main">
                      {invoice.number}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-text-subtle">
                      {invoice.sale.number}
                    </td>
                    <td className="px-6 py-3 text-text-main">{invoice.customer.name}</td>
                    <td className="px-6 py-3 text-text-subtle">
                      {invoice.dueDate.toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-6 py-3 text-text-main">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-6 py-3 text-text-subtle">
                      {formatCurrency(invoice.paidAmount)}
                    </td>
                    <td className="px-6 py-3 text-text-main">
                      {formatCurrency(
                        Number(invoice.total) - Number(invoice.paidAmount),
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge
                        status={effective}
                        label={t(`invoices.${effective.toLowerCase()}`)}
                      />
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/facturas/${invoice.id}`}
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