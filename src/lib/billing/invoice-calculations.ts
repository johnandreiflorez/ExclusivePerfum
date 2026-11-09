import { Prisma } from "@/generated/prisma/client";

export function decimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(value);
}

export function round2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2);
}

export type InvoiceTotals = {
  total: Prisma.Decimal;
};

export function calculateInvoiceTotals(params: {
  subtotal: number | string | Prisma.Decimal;
  discount: number | string | Prisma.Decimal;
  tax: number | string | Prisma.Decimal;
  shipping: number | string | Prisma.Decimal;
  insurance: number | string | Prisma.Decimal;
}): InvoiceTotals {
  const subtotal = decimal(params.subtotal || 0);
  const discount = decimal(params.discount || 0);
  const tax = decimal(params.tax || 0);
  const shipping = decimal(params.shipping || 0);
  const insurance = decimal(params.insurance || 0);

  const total = subtotal.minus(discount).plus(tax).plus(shipping).plus(insurance);
  return { total: round2(total) };
}

export type InstallmentPlanItem = {
  number: number;
  dueDate: Date;
  plannedAmount: Prisma.Decimal;
};

/**
 * Divide el total de la factura en cuotas iguales (la última absorbe
 * el remanente de redondeo) con vencimientos espaciados hacia atrás
 * desde la fecha de vencimiento de la factura.
 * Se cumple RN-005: suma de cuotas == total de la factura.
 */
export function buildInstallmentPlan(params: {
  total: number | string | Prisma.Decimal;
  count: number;
  intervalDays: number;
  dueDate: Date;
}): InstallmentPlanItem[] {
  const total = decimal(params.total || 0);
  if (total.isNegative()) return [];
  if (total.isZero()) return [];

  const count = Math.max(1, Math.floor(params.count || 1));
  const interval = Math.max(1, Math.floor(params.intervalDays || 30));

  const base = total.dividedBy(count);
  const roundedBase = round2(base);

  const items: InstallmentPlanItem[] = [];
  let acc = new Prisma.Decimal(0);

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    let planned = isLast ? total.minus(acc) : roundedBase;
    if (planned.isNegative()) {
      planned = new Prisma.Decimal(0);
    }
    acc = acc.plus(planned);

    const offsetMs = (count - 1 - i) * interval * 24 * 60 * 60 * 1000;
    const dueDate = new Date(params.dueDate.getTime() - offsetMs);

    items.push({ number: i + 1, dueDate, plannedAmount: round2(planned) });
  }

  return items;
}

export function invoiceTotalAsNumber(total: unknown): number {
  return Number(decimal(total as number | string | Prisma.Decimal).toString());
}