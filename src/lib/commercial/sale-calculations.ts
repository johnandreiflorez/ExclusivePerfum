import { Prisma } from "@/generated/prisma/client";

export type SaleItemInput = {
  productId?: string;
  productName: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  discount: number;
};

export type SaleCostInput = {
  type: string;
  description?: string;
  amount: number;
};

export type SaleTotals = {
  subtotal: Prisma.Decimal;
  productCost: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  profit: Prisma.Decimal;
  margin: Prisma.Decimal;
};

export function decimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(round2(value));
}

export function round2(value: number | string | Prisma.Decimal): string {
  const num = new Prisma.Decimal(value instanceof Prisma.Decimal ? value.toString() : value);
  return num.toDecimalPlaces(2).toString();
}

export function calculateItemSubtotal(
  quantity: number,
  unitPrice: number,
  discount: number,
): Prisma.Decimal {
  const qty = new Prisma.Decimal(quantity);
  const price = new Prisma.Decimal(unitPrice || 0);
  const disc = new Prisma.Decimal(discount || 0);
  return qty.times(price).minus(disc);
}

export function calculateSaleTotals(
  items: SaleItemInput[],
  costs: SaleCostInput[],
): SaleTotals {
  let subtotal = new Prisma.Decimal(0);
  let productCost = new Prisma.Decimal(0);

  for (const item of items) {
    subtotal = subtotal.plus(
      calculateItemSubtotal(item.quantity, item.unitPrice, item.discount),
    );
    productCost = productCost.plus(
      new Prisma.Decimal(item.quantity).times(new Prisma.Decimal(item.unitCost || 0)),
    );
  }

  let additionalCost = new Prisma.Decimal(0);
  for (const cost of costs) {
    additionalCost = additionalCost.plus(new Prisma.Decimal(cost.amount || 0));
  }

  const totalCost = productCost.plus(additionalCost);
  const profit = subtotal.minus(totalCost);
  const margin = subtotal.isZero()
    ? new Prisma.Decimal(0)
    : profit.dividedBy(subtotal).times(100);

  return {
    subtotal,
    productCost,
    totalCost,
    profit,
    margin,
  };
}