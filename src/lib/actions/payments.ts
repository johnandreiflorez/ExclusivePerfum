"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { logAudit } from "@/lib/audit";
import { requireUser, assertPermission } from "@/lib/auth/guard";
import { Prisma } from "@/generated/prisma/client";
import { paymentSchema } from "@/lib/validation/fase3";
import { nextPaymentNumber } from "@/lib/billing/numbering";
import { decimal, round2 } from "@/lib/billing/invoice-calculations";
import {
  effectiveInvoiceStatus,
  effectiveInstallmentStatus,
} from "@/lib/billing/status";
import {
  profitExpected,
  recognizedAmount,
  effectiveProfitDistributionStatus,
} from "@/lib/investor/calculations";

export type PaymentActionState = {
  error?: string;
  success?: boolean;
  number?: string;
};

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Datos inválidos";
  }
  return "Ocurrió un error al registrar el pago";
}

export async function createPaymentAction(
  _prevState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const user = await requireUser();
  assertPermission(user, "payments.manage");

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

  const parsed = paymentSchema.safeParse({
    customerId: formData.get("customerId"),
    paymentDate: formData.get("paymentDate") ?? new Date().toISOString().slice(0, 10),
    method: formData.get("method") ?? "OTHER",
    reference:
      typeof formData.get("reference") === "string" ? formData.get("reference") : null,
    observations:
      typeof formData.get("observations") === "string" ? formData.get("observations") : null,
    allocations: allocationsJson,
  });

  if (!parsed.success) {
    return { error: errorMessage(parsed.error) };
  }

  const data = parsed.data;

  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
  });
  if (!customer) return { error: "Cliente no encontrado" };

  const invoiceIds = data.allocations.map((a) => a.invoiceId);
  const invoices = await prisma.invoice.findMany({
    where: { id: { in: invoiceIds } },
    include: { installments: { orderBy: { number: "asc" } } },
  });

  if (invoices.length === 0) {
    return { error: "Facturas no encontradas" };
  }

  let totalAmount = new Prisma.Decimal(0);
  const applied: {
    invoice: (typeof invoices)[number];
    amount: Prisma.Decimal;
  }[] = [];

  for (const allocation of data.allocations) {
    const invoice = invoices.find((inv) => inv.id === allocation.invoiceId);
    if (!invoice) return { error: "Una de las facturas no existe" };
    if (invoice.customerId !== customer.id) {
      return { error: "La factura no pertenece al cliente seleccionado" };
    }
    if (invoice.status === "ANNULLED") {
      return { error: `La factura ${invoice.number} está anulada` };
    }

    const balance = decimal(invoice.total).minus(decimal(invoice.paidAmount));
    const amount = decimal(allocation.amount);
    if (amount.lte(0)) return { error: "El valor aplicado debe ser mayor a 0" };
    if (amount.gt(balance)) {
      return { error: `No se puede aplicar más del saldo de ${invoice.number}` };
    }

    totalAmount = totalAmount.plus(amount);
    applied.push({ invoice, amount: round2(amount) });
  }

  if (totalAmount.lte(0)) {
    return { error: "El valor del pago debe ser mayor a 0" };
  }

  const number = await nextPaymentNumber();

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          number,
          customerId: customer.id,
          paymentDate: data.paymentDate,
          amount: round2(totalAmount).toString(),
          method: data.method,
          reference: data.reference ?? null,
          observations: data.observations ?? null,
          createdById: user.id,
        },
      });

      for (const { invoice, amount } of applied) {
        const newPaid = round2(decimal(invoice.paidAmount).plus(amount));

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaid.toString(),
            status: effectiveInvoiceStatus({
              status: invoice.status,
              total: invoice.total,
              paidAmount: newPaid,
              dueDate: invoice.dueDate,
            }),
          },
        });

        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: invoice.id,
            amount: amount.toString(),
          },
        });
      }

      for (const { invoice, amount } of applied) {
        let remaining = amount;

        for (const installment of invoice.installments) {
          if (remaining.lte(0)) break;
          const installmentBalance = decimal(installment.plannedAmount).minus(
            decimal(installment.paidAmount),
          );
          if (installmentBalance.lte(0)) continue;

          const toPay = remaining.lte(installmentBalance) ? remaining : installmentBalance;
          const newPaid = round2(decimal(installment.paidAmount).plus(toPay));

          await tx.invoiceInstallment.update({
            where: { id: installment.id },
            data: {
              paidAmount: newPaid.toString(),
              status: effectiveInstallmentStatus({
                status: installment.status,
                plannedAmount: installment.plannedAmount,
                paidAmount: newPaid,
                dueDate: installment.dueDate,
              }),
            },
          });

          remaining = remaining.minus(toPay);
        }
      }

      for (const { invoice, amount } of applied) {
        const sale = await tx.sale.findUnique({
          where: { id: invoice.saleId },
          include: { investors: true },
        });
        if (!sale || sale.investors.length === 0) continue;

        const finalPaid = round2(decimal(invoice.paidAmount).plus(amount));

        for (const participation of sale.investors) {
          const expected = profitExpected(sale.profit, participation.percentage);
          if (expected.lte(0)) continue;

          const recognized = recognizedAmount(expected, finalPaid, invoice.total);
          const existing = await tx.profitDistribution.findUnique({
            where: {
              saleInvestorId_invoiceId: {
                saleInvestorId: participation.id,
                invoiceId: invoice.id,
              },
            },
          });

          await tx.profitDistribution.upsert({
            where: {
              saleInvestorId_invoiceId: {
                saleInvestorId: participation.id,
                invoiceId: invoice.id,
              },
            },
            update: {
              recognizedAmount: recognized.toString(),
              status: effectiveProfitDistributionStatus({
                expectedAmount: expected,
                recognizedAmount: recognized,
                paidAmount: existing?.paidAmount ?? "0",
                annulled: false,
              }),
            },
            create: {
              saleInvestorId: participation.id,
              investorId: participation.investorId,
              invoiceId: invoice.id,
              expectedAmount: expected.toString(),
              recognizedAmount: recognized.toString(),
              paidAmount: "0",
              status: effectiveProfitDistributionStatus({
                expectedAmount: expected,
                recognizedAmount: recognized,
                paidAmount: "0",
                annulled: false,
              }),
              generatedAt: data.paymentDate,
            },
          });
        }
      }

      await logAudit({
        entity: "Payment",
        entityId: payment.id,
        action: "PAYMENT_REGISTER",
        after: {
          number,
          customerId: customer.id,
          amount: round2(totalAmount).toString(),
          method: data.method,
          allocations: applied.map((a) => ({
            invoiceId: a.invoice.id,
            invoiceNumber: a.invoice.number,
            amount: a.amount.toString(),
          })),
        },
      });

      await logAudit({
        entity: "Invoice",
        entityId: applied.map((a) => a.invoice.id).join(","),
        action: "PAYMENT_APPLY",
        after: applied.map((a) => ({
          invoiceId: a.invoice.id,
          invoiceNumber: a.invoice.number,
          amount: a.amount.toString(),
        })),
      });
    });

    revalidatePath("/pagos");
    revalidatePath("/facturas");
    revalidatePath("/cartera");
    revalidatePath("/dashboard");
    revalidatePath("/ganancias");
    revalidatePath(`/facturas/${invoiceIds[0]}`);
    revalidatePath(`/clientes/${customer.id}`);
    return { success: true, number };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}