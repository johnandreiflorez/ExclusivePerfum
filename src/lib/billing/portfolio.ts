import "server-only";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import {
  effectiveInvoiceStatus,
  daysOverdue,
  agingBucket,
  type AgingBucket,
} from "@/lib/billing/status";

export type PortfolioSummary = {
  invoiced: Prisma.Decimal;
  collected: Prisma.Decimal;
  pending: Prisma.Decimal;
  overdue: Prisma.Decimal;
  dueSoon: Prisma.Decimal;
};

function add(acc: Prisma.Decimal, value: Prisma.Decimal | number | string): Prisma.Decimal {
  return acc.plus(new Prisma.Decimal(value.toString()));
}

const NOT_ANNULLED = { status: { not: "ANNULLED" as const } };

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "ANNULLED" } },
    select: { total: true, paidAmount: true, dueDate: true },
  });

  const summary: PortfolioSummary = {
    invoiced: new Prisma.Decimal(0),
    collected: new Prisma.Decimal(0),
    pending: new Prisma.Decimal(0),
    overdue: new Prisma.Decimal(0),
    dueSoon: new Prisma.Decimal(0),
  };

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  for (const invoice of invoices) {
    const total = new Prisma.Decimal(invoice.total.toString());
    const paid = new Prisma.Decimal(invoice.paidAmount.toString());
    const balance = total.minus(paid);

    summary.invoiced = add(summary.invoiced, total);
    summary.collected = add(summary.collected, paid);

    if (balance.lte(0)) continue;

    summary.pending = add(summary.pending, balance);

    if (effectiveInvoiceStatus({ ...invoice, status: "PENDING" }) === "OVERDUE") {
      summary.overdue = add(summary.overdue, balance);
    } else if (invoice.dueDate.getTime() - now <= sevenDaysMs) {
      summary.dueSoon = add(summary.dueSoon, balance);
    }
  }

  return summary;
}

export type AgingRow = {
  bucket: AgingBucket;
  total: Prisma.Decimal;
  count: number;
};

export async function getAgingBreakdown(): Promise<AgingRow[]> {
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "ANNULLED" } },
    select: { total: true, paidAmount: true, dueDate: true, status: true },
  });

  const buckets = new Map<AgingBucket, { total: Prisma.Decimal; count: number }>();
  const init = (): { total: Prisma.Decimal; count: number } => ({
    total: new Prisma.Decimal(0),
    count: 0,
  });

  for (const invoice of invoices) {
    const total = new Prisma.Decimal(invoice.total.toString());
    const paid = new Prisma.Decimal(invoice.paidAmount.toString());
    const balance = total.minus(paid);
    if (balance.lte(0)) continue;

    const status = effectiveInvoiceStatus(invoice);
    if (status !== "OVERDUE") continue;

    const days = daysOverdue(invoice.dueDate);
    const bucket = agingBucket(days);
    const current = buckets.get(bucket) ?? init();
    buckets.set(bucket, {
      total: current.total.plus(balance),
      count: current.count + 1,
    });
  }

  return (["0-30", "31-60", "61-90", "91-120", "120+"] as AgingBucket[]).map(
    (bucket) => {
      const row = buckets.get(bucket);
      return {
        bucket,
        total: row?.total ?? new Prisma.Decimal(0),
        count: row?.count ?? 0,
      };
    },
  );
}

export type PortfolioInvoiceRow = {
  id: string;
  number: string;
  customer: { id: string; name: string } | null;
  dueDate: Date;
  total: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  status: string;
  daysOverdue: number;
};

export async function getPortfolioInvoices(params: {
  customerId?: string;
  status?: string;
}): Promise<PortfolioInvoiceRow[]> {
  const invoices = await prisma.invoice.findMany({
    where: {
      ...NOT_ANNULLED,
      customerId: params.customerId || undefined,
    },
    orderBy: { dueDate: "asc" },
    include: { customer: { select: { id: true, name: true } } },
  });

  const rows: PortfolioInvoiceRow[] = [];
  for (const invoice of invoices) {
    if (params.status && params.status !== "ALL") {
      const effective = effectiveInvoiceStatus(invoice);
      if (params.status === "OVERDUE") {
        if (effective !== "OVERDUE") continue;
      } else if (effective !== params.status) {
        continue;
      }
    }

    rows.push({
      id: invoice.id,
      number: invoice.number,
      customer: invoice.customer,
      dueDate: invoice.dueDate,
      total: invoice.total,
      paidAmount: invoice.paidAmount,
      status: effectiveInvoiceStatus(invoice),
      daysOverdue: daysOverdue(invoice.dueDate),
    });
  }

  return rows;
}