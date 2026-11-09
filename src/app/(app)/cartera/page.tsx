import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslation } from "@/lib/i18n";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader, EmptyState, StatCard } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/money";
import { PortfolioIcon } from "@/components/ui/icons";
import { CustomerFilterSelect } from "./filter-select";
import {
  getPortfolioSummary,
  getAgingBreakdown,
  getPortfolioInvoices,
} from "@/lib/billing/portfolio";

const STATUS_OPTIONS = ["ALL", "PENDING", "PARTIAL", "PAID", "OVERDUE"] as const;

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; cliente?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "portfolio.view")) redirect("/dashboard");

  const t = getTranslation;
  const params = await searchParams;

  const status = STATUS_OPTIONS.includes(params.estado as (typeof STATUS_OPTIONS)[number])
    ? (params.estado as string)
    : "ALL";

  const [summary, aging, customers, invoices] = await Promise.all([
    getPortfolioSummary(),
    getAgingBreakdown(),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getPortfolioInvoices({ customerId: params.cliente, status }),
  ]);

  const filterUrl = (estado: string, cliente?: string) =>
    `/cartera?estado=${estado}${cliente ? `&cliente=${cliente}` : ""}`;

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("nav.portfolio")}
        description={t("portfolio.title")}
        icon={<PortfolioIcon className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 gap-gap sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={t("portfolio.invoiced")} value={formatCurrency(summary.invoiced)} />
        <StatCard label={t("portfolio.collected")} value={formatCurrency(summary.collected)} />
        <StatCard
          label={t("portfolio.pending")}
          value={formatCurrency(summary.pending)}
          tone="brand"
        />
        <StatCard
          label={t("portfolio.overdue")}
          value={formatCurrency(summary.overdue)}
          tone={summary.overdue.gt(0) ? "danger" : "success"}
        />
        <StatCard label={t("portfolio.dueSoon")} value={formatCurrency(summary.dueSoon)} />
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-text-main">{t("portfolio.aging")}</h2>
        <div className="mt-4 grid grid-cols-1 gap-gap sm:grid-cols-2 lg:grid-cols-5">
          {aging.map((row, index) => {
            const labels = [
              t("portfolio.over30"),
              t("portfolio.over60"),
              t("portfolio.over90"),
              t("portfolio.over120"),
              t("portfolio.over120plus"),
            ];
            return (
              <div key={row.bucket}>
                <p className="text-sm text-text-subtle">{labels[index]}</p>
                <p className="mt-1 text-xl font-bold text-text-main">
                  {formatCurrency(row.total)}
                </p>
                <p className="text-xs text-text-faint">
                  {row.count} {t("invoices.status").toLowerCase()}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <nav className="flex flex-wrap gap-2" aria-label={t("portfolio.filterStatus")}>
          {STATUS_OPTIONS.map((option) => (
            <Link
              key={option}
              href={filterUrl(option, params.cliente)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium shadow-card transition-colors ${
                status === option
                  ? "bg-brand-600 text-text-inverse"
                  : "border border-border-default bg-surface-primary text-text-subtle hover:bg-surface-tertiary"
              }`}
            >
              {option === "ALL"
                ? t("portfolio.allStatuses")
                : t(`invoices.${option.toLowerCase()}`)}
            </Link>
          ))}
        </nav>

        <CustomerFilterSelect
          status={status}
          current={params.cliente}
          customers={customers}
        />
      </div>

      {invoices.length === 0 ? (
        <EmptyState message={t("portfolio.empty")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">{t("invoices.number")}</th>
                <th className="px-6 py-3 font-medium">{t("payments.invoice")}</th>
                <th className="px-6 py-3 font-medium">{t("invoices.dueDate")}</th>
                <th className="px-6 py-3 font-medium">{t("invoices.total")}</th>
                <th className="px-6 py-3 font-medium">{t("invoices.paidAmount")}</th>
                <th className="px-6 py-3 font-medium">{t("invoices.balance")}</th>
                <th className="px-6 py-3 font-medium">{t("portfolio.daysOverdue")}</th>
                <th className="px-6 py-3 font-medium">{t("invoices.status")}</th>
                <th className="px-6 py-3 font-medium">{t("common.details")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-border-default last:border-0 hover:bg-surface-secondary"
                >
                  <td className="px-6 py-3 font-mono text-xs font-medium text-text-main">
                    {invoice.number}
                  </td>
                  <td className="px-6 py-3 text-text-main">
                    {invoice.customer?.name ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-text-subtle">
                    {invoice.dueDate.toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-6 py-3 text-text-main">
                    {formatCurrency(invoice.total)}
                  </td>
                  <td className="px-6 py-3 text-text-subtle">
                    {formatCurrency(invoice.paidAmount)}
                  </td>
                  <td className="px-6 py-3 font-medium text-text-main">
                    {formatCurrency(Number(invoice.total) - Number(invoice.paidAmount))}
                  </td>
                  <td className="px-6 py-3 text-text-subtle">
                    {invoice.status === "OVERDUE" ? invoice.daysOverdue : 0}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge
                      status={invoice.status}
                      label={t(`invoices.${invoice.status.toLowerCase()}`)}
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
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}