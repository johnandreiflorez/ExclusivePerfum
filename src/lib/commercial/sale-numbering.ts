import "server-only";
import { prisma } from "@/lib/prisma/client";

export async function nextSaleNumber(): Promise<string> {
  const year = new Date().getFullYear();

  return prisma.$transaction(async (tx) => {
    const counter = await tx.saleCounter.upsert({
      where: { year },
      update: { last: { increment: 1 } },
      create: { year, last: 1 },
    });
    return `V-${year}-${String(counter.last).padStart(6, "0")}`;
  });
}