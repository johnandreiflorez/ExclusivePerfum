"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { logAudit } from "@/lib/audit";
import { requireUser, assertPermission } from "@/lib/auth/guard";
import { Prisma } from "@/generated/prisma/client";
import { investorPaymentSchema } from "@/lib/validation/fase4";
import { nextInvestorPaymentNumber } from "@/lib/investor/numbering";
import {
  availableForPayout,
  decimal,
  effectiveProfitDistributionStatus,
  round2,
} from "@/lib/investor/calculations";

export type InvestorPaymentActionState = {
  error?: string;
  success?: boolean;
  number?: string;
};

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Datos inválidos";
  }
  return "Ocurrió un error al registrar el pago a inversor";
}

export async function createInvestorPaymentAction(
  _prevState: InvestorPaymentActionState,
  formData: FormData,
): Promise<InvestorPaymentActionState> {
  const user = await requireUser();
  assertPermission(user, "profits.manage");

  const allocationsRaw = formData.get("allocations");
  if (typeof allocationsRaw !== "string") {
    return { error: "Datos de aplicación inválidos" };
  }

  let allocationsJson: unknown;
  try {
    allocationsJson = allocationsRaw ? JSON.parse(allocationsRaw) : [];
  } catch {
    return { error: "Datos de aplicación inválidos" };
  }

  const parsed = investorPaymentSchema.safeParse({
    investorId: formData.get("investorId"),
    paymentDate:
      formData.get("paymentDate") ?? new Date().toISOString().slice(0, 10),
    method: formData.get("method") ?? "OTHER",
    reference:
      typeof formData.get("reference") === "string"
        ? formData.get("reference")
        : null,
    observations:
      typeof formData.get("observations") === "string"
        ? formData.get("observations")
        : null,
    allocations: allocationsJson,
  });

  if (!parsed.success) {
    return { error: errorMessage(parsed.error) };
  }

  const data = parsed.data;

  const investor = await prisma.investor.findUnique({
    where: { id: data.investorId },
  });
  if (!investor) return { error: "Inversor no encontrado" };
  if (investor.status !== "ACTIVE") {
    return { error: "El inversor está inactivo o bloqueado" };
  }

  const distributionIds = data.allocations.map((a) => a.profitDistributionId);
  const distributions = await prisma.profitDistribution.findMany({
    where: {
      id: { in: distributionIds },
      investorId: investor.id,
    },
  });

  if (distributions.length === 0) {
    return { error: "Ganancias no encontradas" };
  }

  let totalAmount = new Prisma.Decimal(0);
  const applied: {
    distribution: (typeof distributions)[number];
    amount: Prisma.Decimal;
  }[] = [];

  for (const allocation of data.allocations) {
    const distribution = distributions.find(
      (d) => d.id === allocation.profitDistributionId,
    );
    if (!distribution) return { error: "Una de las ganancias no existe" };
    if (distribution.investorId !== investor.id) {
      return { error: "La ganancia no pertenece al inversor seleccionado" };
    }
    if (distribution.status === "ANULADA") {
      return { error: "La ganancia está anulada" };
    }

    const available = availableForPayout(distribution);
    const amount = decimal(allocation.amount);
    if (amount.lte(0)) {
      return { error: "El valor aplicado debe ser mayor a 0" };
    }
    if (amount.gt(available)) {
      return { error: `No se puede pagar más del disponible de la ganancia (${round2(available)})` };
    }

    totalAmount = totalAmount.plus(amount);
    applied.push({ distribution, amount });
  }

  if (totalAmount.lte(0)) {
    return { error: "El valor del pago debe ser mayor a 0" };
  }

  const number = await nextInvestorPaymentNumber();

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.investorPayment.create({
        data: {
          number,
          investorId: investor.id,
          paymentDate: data.paymentDate,
          amount: round2(totalAmount).toString(),
          method: data.method,
          reference: data.reference ?? null,
          observations: data.observations ?? null,
          createdById: user.id,
        },
      });

      for (const { distribution, amount } of applied) {
        const newPaid = round2(decimal(distribution.paidAmount).plus(amount));

        await tx.profitDistribution.update({
          where: { id: distribution.id },
          data: {
            paidAmount: newPaid,
            paidAt: distribution.paidAt ?? data.paymentDate,
            status: effectiveProfitDistributionStatus({
              expectedAmount: distribution.expectedAmount,
              recognizedAmount: distribution.recognizedAmount,
              paidAmount: newPaid,
              annulled: false,
            }),
          },
        });

        await tx.investorPaymentAllocation.create({
          data: {
            investorPaymentId: payment.id,
            profitDistributionId: distribution.id,
            amount: amount.toString(),
          },
        });
      }

      await logAudit({
        entity: "InvestorPayment",
        entityId: payment.id,
        action: "INVESTOR_PAYMENT",
        after: {
          number,
          investorId: investor.id,
          amount: round2(totalAmount).toString(),
          method: data.method,
          allocations: applied.map((a) => ({
            profitDistributionId: a.distribution.id,
            amount: a.amount.toString(),
          })),
        },
      });
    });

    revalidatePath("/pagos-inversores");
    revalidatePath("/ganancias");
    revalidatePath(`/inversores/${investor.id}`);
    revalidatePath("/dashboard");
    return { success: true, number };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}