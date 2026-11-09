import "server-only";
import { prisma } from "@/lib/prisma/client";

export async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();

  return prisma.$transaction(async (tx) => {
    const counter = await tx.invoiceCounter.upsert({
      where: { year },
      update: { last: { increment: 1 } },
      create: { year, last: 1 },
    });
    return `FAC-${year}-${String(counter.last).padStart(6, "0")}`;
  });
}

export async function nextPaymentNumber(): Promise<string> {
  const year = new Date().getFullYear();

  return prisma.$transaction(async (tx) => {
    const counter = await tx.paymentCounter.upsert({
      where: { year },
      update: { last: { increment: 1 } },
      create: { year, last: 1 },
    });
    return `PAG-${year}-${String(counter.last).padStart(6, "0")}`;
  });
}