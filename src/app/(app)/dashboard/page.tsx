import "server-only";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { getTranslation } from "@/lib/i18n";
import { formatCurrency, toNumber } from "@/lib/money";
import { StatCard } from "@/components/ui/layout";
import { Prisma } from "@/generated/prisma/client";
import { investmentBalance, availableForPayout } from "@/lib/investor/calculations";

export default async function DashboardPage() {
  const user = await getSessionUser();
  const t = getTranslation;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const inAWeek = new Date(today);
  inAWeek.setDate(inAWeek.getDate() + 7);

  const [customerCount, productCount, todaySales, monthSales, draftCount, shipmentPending, invoices, pastDueInstallments, investors, pendingProfitDistributions] =
    await Promise.all([
      prisma.customer.count(),
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.sale.findMany({
        where: {
          status: { not: "CANCELLED" },
          saleDate: { gte: today },
        },
      }),
      prisma.sale.findMany({
        where: {
          status: { not: "CANCELLED" },
          saleDate: { gte: monthStart },
        },
      }),
      prisma.sale.count({ where: { status: "DRAFT" } }),
      prisma.shipment.count({ where: { status: { in: ["PENDING", "PREPARING"] } } }),
      prisma.invoice.findMany({ where: { status: { not: "ANNULLED" } } }),
      prisma.invoiceInstallment.findMany({ where: { dueDate: { lt: today } } }),
      prisma.investor.findMany({
        include: { investments: true },
      }),
      prisma.profitDistribution.findMany({
        where: { status: { in: ["GENERADA", "PENDIENTE_PAGO"] } },
      }),
    ]);

  const receivableInvoices = invoices.filter(
    (inv) => toNumber(inv.paidAmount) < toNumber(inv.total),
  );
  const overdueInvoices = receivableInvoices.filter((inv) => inv.dueDate < today);
  const dueSoonInvoices = receivableInvoices.filter(
    (inv) => inv.dueDate >= today && inv.dueDate <= inAWeek,
  );
  const owedInstallments = pastDueInstallments.filter(
    (inst) => toNumber(inst.paidAmount) < toNumber(inst.plannedAmount),
  );

  const sum = (sales: { subtotal: unknown }[]) =>
    sales.reduce((acc: number, s) => acc + Number(s.subtotal), 0);

  const avgMonth = monthSales.length > 0 ? sum(monthSales) / monthSales.length : 0;

  const receivables = receivableInvoices.reduce(
    (acc, inv) => acc + (toNumber(inv.total) - toNumber(inv.paidAmount)),
    0,
  );

  const totalCapital = investors.reduce((acc, investor) => {
    const balance = investmentBalance(investor.investments);
    return acc.plus(balance.saldo);
  }, new Prisma.Decimal(0));

  const pendingGains = pendingProfitDistributions.reduce(
    (acc, distribution) => acc.plus(availableForPayout(distribution)),
    new Prisma.Decimal(0),
  );

  const stats = [
    { label: t("dashboard.subtotal"), value: formatCurrency(sum(todaySales)), hint: t("sales.title"), tone: "brand" as const },
    { label: t("dashboard.monthSales"), value: formatCurrency(sum(monthSales)) },
    { label: t("nav.customers"), value: customerCount },
    { label: t("nav.products"), value: productCount },
    { label: t("dashboard.avgMonth"), value: formatCurrency(avgMonth) },
    { label: t("nav.shipments"), value: shipmentPending, hint: t("dashboard.alerts"), tone: shipmentPending > 0 ? ("warning" as const) : ("default" as const) },
    { label: t("sales.draft"), value: draftCount, hint: t("sales.status") },
    { label: t("dashboard.receivables"), value: formatCurrency(receivables), tone: receivables > 0 ? ("brand" as const) : ("default" as const) },
    { label: t("investors.capital"), value: formatCurrency(totalCapital), hint: t("nav.investments") },
    { label: t("investors.pendingProfits"), value: formatCurrency(pendingGains), tone: pendingGains.gt(0) ? ("warning" as const) : ("default" as const), hint: t("nav.profits") },
  ];

  const roleNames = user?.roles.map((r) => r.role.name).join(", ") ?? "-";

  const alerts: { text: string; href: string; count: number }[] = [
    { text: t("alerts.overdueInvoices"), href: "/cartera?estado=OVERDUE", count: overdueInvoices.length },
    { text: t("alerts.dueSoonInvoices"), href: "/cartera", count: dueSoonInvoices.length },
    { text: t("alerts.overdueInstallments"), href: "/facturas", count: owedInstallments.length },
    { text: t("alerts.pendingShipments"), href: "/despachos", count: shipmentPending },
    { text: t("alerts.pendingInvestorPayments"), href: "/ganancias", count: pendingProfitDistributions.length },
  ].filter((alert) => alert.count > 0);

  return (
    <div className="flex flex-col gap-gap">
      <h1 className="text-2xl font-bold tracking-tight text-text-main">
        {t("common.appName")}
      </h1>

      <div className="grid grid-cols-1 gap-gap sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="rounded-xl border border-border-default bg-surface-primary p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-main">{t("dashboard.alerts")}</h2>
          <span className="text-sm text-text-subtle">{roleNames}</span>
        </div>
        {alerts.length === 0 ? (
          <p className="mt-2 text-sm text-text-subtle">{t("dashboard.noAlerts")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {alerts.map((alert) => (
              <li key={alert.text}>
                <Link
                  href={alert.href}
                  className="flex items-center justify-between gap-4 rounded-md border border-status-warning/30 bg-status-warning/5 px-4 py-2.5 text-sm transition-colors hover:bg-status-warning/10"
                >
                  <span className="text-text-main">{alert.text}</span>
                  <span className="font-semibold text-text-main">{alert.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}