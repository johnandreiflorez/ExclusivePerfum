import { Prisma } from "@/generated/prisma/client";
import type {
  InvestmentType,
  ProfitDistributionStatus,
} from "@/generated/prisma/client";

export function decimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(round2(value));
}

export function round2(value: number | string | Prisma.Decimal | null): string {
  const num = new Prisma.Decimal(
    value instanceof Prisma.Decimal || value == null ? (value?.toString() ?? "0") : value,
  );
  return num.toDecimalPlaces(2).toString();
}

export function isPositive(value: Prisma.Decimal): boolean {
  return value.gt(0);
}

export const INVESTMENT_SIGNS: Record<InvestmentType, 1 | -1> = {
  APORTE: 1,
  AJUSTE: 1,
  RETIRO: -1,
  DEVOLUCION: -1,
};

export type InvestmentFlow = {
  type: InvestmentType;
  amount: Prisma.Decimal | string | number;
};

export type InvestmentBalance = {
  aportes: Prisma.Decimal;
  retiros: Prisma.Decimal;
  saldo: Prisma.Decimal;
};

export function investmentBalance(investments: InvestmentFlow[]): InvestmentBalance {
  let aportes = new Prisma.Decimal(0);
  let retiros = new Prisma.Decimal(0);
  let saldo = new Prisma.Decimal(0);

  for (const move of investments) {
    const amount = decimal(move.amount);
    if (INVESTMENT_SIGNS[move.type] === 1) {
      aportes = aportes.plus(amount);
      saldo = saldo.plus(amount);
    } else {
      retiros = retiros.plus(amount);
      saldo = saldo.minus(amount);
    }
  }

  return { aportes, retiros, saldo };
}

export function capitalUtilizado(participations: { amount: Prisma.Decimal }[]): Prisma.Decimal {
  return participations.reduce(
    (acc, p) => acc.plus(p.amount),
    new Prisma.Decimal(0),
  );
}

export function profitExpected(
  saleProfit: Prisma.Decimal | string | number,
  percentage: Prisma.Decimal | string | number,
): Prisma.Decimal {
  return decimal(saleProfit).times(decimal(percentage)).dividedBy(100);
}

export function fractionCollected(
  paidAmount: Prisma.Decimal | string | number,
  total: Prisma.Decimal | string | number,
): Prisma.Decimal {
  const invoiceTotal = decimal(total);
  if (invoiceTotal.lte(0)) return new Prisma.Decimal(0);
  const paid = decimal(paidAmount);
  const fraction = paid.dividedBy(invoiceTotal);
  if (fraction.lte(0)) return new Prisma.Decimal(0);
  if (fraction.gte(1)) return new Prisma.Decimal(1);
  return fraction;
}

export function recognizedAmount(
  expected: Prisma.Decimal | string | number,
  paidAmount: Prisma.Decimal | string | number,
  invoiceTotal: Prisma.Decimal | string | number,
): Prisma.Decimal {
  return decimal(expected)
    .times(fractionCollected(paidAmount, invoiceTotal))
    .toDecimalPlaces(2);
}

export function availableForPayout(distribution: {
  recognizedAmount: Prisma.Decimal | string | number;
  paidAmount: Prisma.Decimal | string | number;
}): Prisma.Decimal {
  const available = decimal(distribution.recognizedAmount).minus(
    decimal(distribution.paidAmount),
  );
  return available.gt(0) ? available : new Prisma.Decimal(0);
}

export function effectiveProfitDistributionStatus(input: {
  expectedAmount: Prisma.Decimal | string | number;
  recognizedAmount: Prisma.Decimal | string | number;
  paidAmount: Prisma.Decimal | string | number;
  annulled?: boolean;
}): ProfitDistributionStatus {
  if (input.annulled) return "ANULADA";

  const expected = decimal(input.expectedAmount);
  const recognized = decimal(input.recognizedAmount);
  const paid = decimal(input.paidAmount);
  const available = recognized.minus(paid);

  if (recognized.lte(0)) return "GENERADA";
  if (available.lte(0)) return "PAGADA";
  if (recognized.gte(expected) && expected.gt(0)) return "PENDIENTE_PAGO";
  return "GENERADA";
}