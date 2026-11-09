import { Prisma } from "@/generated/prisma/client";

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isBeforeToday(date: Date): boolean {
  return date < startOfToday();
}

export type InvoiceLike = {
  status: string;
  total: Prisma.Decimal | number | string;
  paidAmount: Prisma.Decimal | number | string;
  dueDate: Date;
};

export type InvoiceStatusValue =
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "ANNULLED";

export function effectiveInvoiceStatus(invoice: InvoiceLike): InvoiceStatusValue {
  if (invoice.status === "ANNULLED") return "ANNULLED";

  const total = new Prisma.Decimal(invoice.total.toString());
  const paid = new Prisma.Decimal(invoice.paidAmount.toString());
  const balance = total.minus(paid);

  if (balance.lte(0)) return "PAID";
  if (isBeforeToday(invoice.dueDate)) return "OVERDUE";
  if (paid.gt(0)) return "PARTIAL";
  return "PENDING";
}

export type InstallmentLike = {
  status: string;
  plannedAmount: Prisma.Decimal | number | string;
  paidAmount: Prisma.Decimal | number | string;
  dueDate: Date;
};

export type InstallmentStatusValue =
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE";

export function effectiveInstallmentStatus(
  installment: InstallmentLike,
): InstallmentStatusValue {
  const planned = new Prisma.Decimal(installment.plannedAmount.toString());
  const paid = new Prisma.Decimal(installment.paidAmount.toString());
  const balance = planned.minus(paid);

  if (balance.lte(0)) return "PAID";
  if (isBeforeToday(installment.dueDate)) return "OVERDUE";
  if (paid.gt(0)) return "PARTIAL";
  return "PENDING";
}

export function daysOverdue(dueDate: Date): number {
  const today = startOfToday();
  const diffMs = today.getTime() - dueDate.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

export type AgingBucket = "0-30" | "31-60" | "61-90" | "91-120" | "120+";

export function agingBucket(days: number): AgingBucket {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 120) return "91-120";
  return "120+";
}