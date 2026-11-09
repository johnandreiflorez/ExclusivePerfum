"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { logAudit } from "@/lib/audit";
import { requireUser, assertPermission } from "@/lib/auth/guard";
import { saleSchema } from "@/lib/validation/fase2";
import { saleInvestorsSchema } from "@/lib/validation/fase4";
import { nextSaleNumber } from "@/lib/commercial/sale-numbering";
import {
  calculateSaleTotals,
  decimal,
} from "@/lib/commercial/sale-calculations";

export type SaleActionState = {
  error?: string;
  success?: boolean;
  number?: string;
};

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Datos inválidos";
  }
  return "Ocurrió un error al guardar la venta";
}

export async function createSaleAction(
  _prevState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const user = await requireUser();
  assertPermission(user, "sales.create");

  const itemsRaw = formData.get("items");
  const costsRaw = formData.get("costs");

  if (typeof itemsRaw !== "string") {
    return { error: "Datos de productos inválidos" };
  }

  let itemsJson: unknown;
  try {
    itemsJson = itemsRaw ? JSON.parse(itemsRaw) : [];
  } catch {
    return { error: "Datos de productos inválidos" };
  }

  let costsJson: unknown = [];
  if (typeof costsRaw === "string" && costsRaw !== "") {
    try {
      costsJson = JSON.parse(costsRaw);
    } catch {
      return { error: "Datos de costos inválidos" };
    }
  }

  let investorsJson: unknown = [];
  const investorsRaw = formData.get("investors");
  if (typeof investorsRaw === "string" && investorsRaw !== "") {
    try {
      investorsJson = JSON.parse(investorsRaw);
    } catch {
      return { error: "Datos de inversores inválidos" };
    }
  }

  const parsedInvestors = saleInvestorsSchema.safeParse(investorsJson);
  if (!parsedInvestors.success) {
    return { error: errorMessage(parsedInvestors.error) };
  }
  const investorsData = parsedInvestors.data;

  const parsed = saleSchema.safeParse({
    customerId: formData.get("customerId"),
    saleDate: formData.get("saleDate") ?? new Date().toISOString().slice(0, 10),
    observations:
      typeof formData.get("observations") === "string"
        ? formData.get("observations")
        : null,
    items: itemsJson,
    costs: costsJson,
  });

  if (!parsed.success) {
    return { error: errorMessage(parsed.error) };
  }

  const data = parsed.data;

  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
  });
  if (!customer) return { error: "Cliente no encontrado" };
  if (customer.status === "BLOCKED" || customer.status === "INACTIVE") {
    return { error: "El cliente está inactivo o bloqueado" };
  }

  if (investorsData.length > 0) {
    const investorIds = investorsData.map((inv) => inv.investorId);
    const investors = await prisma.investor.findMany({
      where: { id: { in: investorIds } },
    });
    if (investors.length !== investorIds.length) {
      return { error: "Uno de los inversores no existe" };
    }
    const inactive = investors.filter((inv) => inv.status !== "ACTIVE");
    if (inactive.length > 0) {
      return { error: "Uno de los inversores está inactivo o bloqueado" };
    }
  }

  const number = await nextSaleNumber();
  const totals = calculateSaleTotals(
    data.items.map((item) => ({
      productId: item.productId ?? undefined,
      productName: item.productName,
      quantity: item.quantity,
      unitCost: item.unitCost,
      unitPrice: item.unitPrice,
      discount: item.discount,
    })),
    data.costs.map((cost) => ({
      type: cost.type,
      description: cost.description ?? undefined,
      amount: cost.amount,
    })),
  );

  const activeProducts = data.items
    .map((i) => i.productId)
    .filter((id): id is string => id !== null && id !== undefined);

  try {
    const sale = await prisma.$transaction(async (tx) => {
      if (activeProducts.length > 0) {
        const products = await tx.product.findMany({
          where: { id: { in: activeProducts } },
        });
        const inactive = products.filter((p) => p.status === "INACTIVE");
        if (inactive.length > 0) {
          throw new Error("_INACTIVE_PRODUCT");
        }
      }

      return tx.sale.create({
        data: {
          number,
          customerId: data.customerId,
          saleDate: data.saleDate,
          observations: data.observations ?? null,
          subtotal: decimal(totals.subtotal).toString(),
          totalCost: decimal(totals.totalCost).toString(),
          profit: decimal(totals.profit).toString(),
          margin: decimal(totals.margin).toString(),
          createdById: user.id,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId ?? null,
              productName: item.productName,
              quantity: item.quantity,
              unitCost: decimal(item.unitCost).toString(),
              unitPrice: decimal(item.unitPrice).toString(),
              discount: decimal(item.discount).toString(),
              subtotal: calculateSaleTotals(
                [
                  {
                    productName: item.productName,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                  },
                ],
                [],
              ).subtotal.toString(),
            })),
          },
          costs: {
            create: (data.costs ?? []).map((cost) => ({
              type: cost.type,
              description: cost.description ?? null,
              amount: decimal(cost.amount).toString(),
            })),
          },
          investors:
            investorsData.length > 0
              ? {
                  create: investorsData.map((inv) => ({
                    investorId: inv.investorId,
                    amount: decimal(inv.amount).toString(),
                    percentage: decimal(inv.percentage).toString(),
                  })),
                }
              : undefined,
        },
      });
    });

    await logAudit({
      entity: "Sale",
      entityId: sale.id,
      action: "CREATE",
      after: { id: sale.id, number: sale.number, status: "DRAFT" },
    });

    revalidatePath("/ventas");
    revalidatePath("/dashboard");
    return { success: true, number: sale.number };
  } catch (error) {
    if (
      (error as { message?: string })?.message === "_INACTIVE_PRODUCT"
    ) {
      return { error: "Uno de los productos está inactivo" };
    }
    return { error: errorMessage(error) };
  }
}

const SALE_STATUSES = ["DRAFT", "CONFIRMED", "CANCELLED"] as const;
type SaleStatusValue = (typeof SALE_STATUSES)[number];

function isSaleStatus(value: string): value is SaleStatusValue {
  return (SALE_STATUSES as readonly string[]).includes(value);
}

export async function updateSaleStatusAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; number?: string; success?: boolean }> {
  const user = await requireUser();
  assertPermission(user, "sales.manage");

  const id = formData.get("id");
  const statusRaw = formData.get("status");

  if (typeof id !== "string" || typeof statusRaw !== "string") {
    return { error: "Parámetros inválidos" };
  }
  if (!isSaleStatus(statusRaw)) return { error: "Estado inválido" };

  const sale = await prisma.sale.findUnique({
    where: { id },
  });
  if (!sale) return { error: "Venta no encontrada" };

  if (statusRaw === "CANCELLED") {
    if (sale.status !== "DRAFT" && sale.status !== "CONFIRMED") {
      return { error: "No se puede cancelar esta venta" };
    }
  }

  if (statusRaw === "CONFIRMED" && sale.status !== "DRAFT") {
    return { error: "Solo las ventas en borrador pueden confirmarse" };
  }

  try {
    const before = { status: sale.status };

    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: { status: statusRaw },
      });

      if (statusRaw === "CANCELLED") {
        const saleInvestors = await tx.saleInvestor.findMany({
          where: { saleId: id },
          select: { id: true },
        });
        if (saleInvestors.length > 0) {
          await tx.profitDistribution.updateMany({
            where: {
              saleInvestorId: { in: saleInvestors.map((si) => si.id) },
              status: { not: "PAGADA" },
            },
            data: { status: "ANULADA" },
          });
        }
      }
    });

    await logAudit({
      entity: "Sale",
      entityId: sale.id,
      action: statusRaw === "CANCELLED" ? "CANCEL" : "UPDATE",
      before,
      after: { status: statusRaw },
    });

    revalidatePath("/ventas");
    revalidatePath(`/ventas/${sale.id}`);
    revalidatePath("/inversores");
    revalidatePath("/ganancias");
    revalidatePath("/dashboard");
    return { success: true, number: sale.number };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}