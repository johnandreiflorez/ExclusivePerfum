"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { logAudit } from "@/lib/audit";
import { requireUser, assertPermission } from "@/lib/auth/guard";
import { Prisma } from "@/generated/prisma/client";
import { invoiceSchema } from "@/lib/validation/fase3";
import { nextInvoiceNumber } from "@/lib/billing/numbering";
import {
  calculateInvoiceTotals,
  buildInstallmentPlan,
  decimal,
  round2,
} from "@/lib/billing/invoice-calculations";
import { effectiveInvoiceStatus } from "@/lib/billing/status";

export type InvoiceActionState = {
  error?: string;
  success?: boolean;
  number?: string;
};

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Datos inválidos";
  }
  return "Ocurrió un error al guardar la factura";
}

export async function createInvoiceAction(
  _prevState: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const user = await requireUser();
  assertPermission(user, "invoices.manage");

  const parsed = invoiceSchema.safeParse({
    saleId: formData.get("saleId"),
    dueDate: formData.get("dueDate"),
    discount: formData.get("discount"),
    tax: formData.get("tax"),
    shipping: formData.get("shipping"),
    insurance: formData.get("insurance"),
    installments: formData.get("installments"),
    intervalDays: formData.get("intervalDays"),
  });

  if (!parsed.success) {
    return { error: errorMessage(parsed.error) };
  }

  const data = parsed.data;

  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    include: { customer: true },
  });
  if (!sale) return { error: "Venta no encontrada" };
  if (sale.status === "CANCELLED") {
    return { error: "Una venta cancelada no puede facturarse" };
  }

  const existing = await prisma.invoice.findFirst({
    where: { saleId: sale.id, status: { not: "ANNULLED" } },
  });
  if (existing) {
    return { error: "La venta ya tiene factura" };
  }

  const totals = calculateInvoiceTotals({
    subtotal: sale.subtotal,
    discount: data.discount,
    tax: data.tax,
    shipping: data.shipping,
    insurance: data.insurance,
  });

  const total = round2(totals.total);

  const plan = buildInstallmentPlan({
    total,
    count: data.installments,
    intervalDays: data.intervalDays,
    dueDate: data.dueDate,
  });

  const initialStatus = effectiveInvoiceStatus({
    status: "PENDING",
    total,
    paidAmount: new Prisma.Decimal(0),
    dueDate: data.dueDate,
  });

  const number = await nextInvoiceNumber();

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      return tx.invoice.create({
        data: {
          number,
          saleId: sale.id,
          customerId: sale.customerId,
          issueDate: new Date(),
          dueDate: data.dueDate,
          subtotal: decimal(sale.subtotal).toString(),
          discount: decimal(data.discount).toString(),
          tax: decimal(data.tax).toString(),
          shipping: decimal(data.shipping).toString(),
          insurance: decimal(data.insurance).toString(),
          total: total.toString(),
          paidAmount: "0",
          status: initialStatus,
          createdById: user.id,
          installments: {
            create: plan.map((item) => ({
              number: item.number,
              dueDate: item.dueDate,
              plannedAmount: item.plannedAmount.toString(),
              paidAmount: "0",
              status: "PENDING",
            })),
          },
        },
      });
    });

    await logAudit({
      entity: "Invoice",
      entityId: invoice.id,
      action: "CREATE",
      after: {
        id: invoice.id,
        number: invoice.number,
        saleNumber: sale.number,
        total: total.toString(),
        installments: plan.length,
        status: "PENDING",
      },
    });

    revalidatePath("/facturas");
    revalidatePath("/cartera");
    revalidatePath("/dashboard");
    revalidatePath(`/ventas/${sale.id}`);
    revalidatePath(`/clientes/${sale.customer.id}`);
    return { success: true, number: invoice.number };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function annulInvoiceAction(
  _prevState: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const user = await requireUser();
  assertPermission(user, "invoices.manage");

  const id = formData.get("id");
  if (typeof id !== "string") return { error: "Parámetros inválidos" };

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return { error: "Factura no encontrada" };
  if (invoice.status === "ANNULLED") return { error: "La factura ya está anulada" };

  const paid = decimal(invoice.paidAmount);
  if (paid.gt(0)) {
    return { error: "No se puede anular una factura con pagos aplicados" };
  }

  const before = { status: invoice.status };

  try {
    await prisma.invoice.update({
      where: { id },
      data: { status: "ANNULLED" },
    });

    await logAudit({
      entity: "Invoice",
      entityId: invoice.id,
      action: "CANCEL",
      before,
      after: { status: "ANNULLED" },
    });

    revalidatePath("/facturas");
    revalidatePath("/cartera");
    revalidatePath("/dashboard");
    return { success: true, number: invoice.number };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}