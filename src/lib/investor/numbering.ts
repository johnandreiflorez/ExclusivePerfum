import "server-only";
import { prisma } from "@/lib/prisma/client";

export async function nextInvestorPaymentNumber(): Promise<string> {
  const year = new Date().getFullYear();

  return prisma.$transaction(async (tx) => {
    const counter = await tx.investorPaymentCounter.upsert({
      where: { year },
      update: { last: { increment: 1 } },
      create: { year, last: 1 },
    });
    return `IP-${year}-${String(counter.last).padStart(6, "0")}`;
  });
}