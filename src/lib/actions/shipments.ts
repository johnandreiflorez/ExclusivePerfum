"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { logAudit } from "@/lib/audit";
import { requireUser, assertPermission } from "@/lib/auth/guard";
import { shipmentSchema } from "@/lib/validation/fase2";
import { decimal } from "@/lib/commercial/sale-calculations";

export type ShipmentActionState = {
  error?: string;
  success?: boolean;
};

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Datos inválidos";
  }
  return "Ocurrió un error al guardar el despacho";
}

function optionalString(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

export async function createShipmentAction(
  _prevState: ShipmentActionState,
  formData: FormData,
): Promise<ShipmentActionState> {
  const user = await requireUser();
  assertPermission(user, "shipments.manage");

  const parsed = shipmentSchema.safeParse({
    saleId: formData.get("saleId"),
    shipmentDate: formData.get("shipmentDate") ?? new Date().toISOString().slice(0, 10),
    carrier: formData.get("carrier"),
    trackingNumber: optionalString(formData.get("trackingNumber")),
    shippingCost:
      typeof formData.get("shippingCost") === "string"
        ? formData.get("shippingCost")
        : "0",
    insurance:
      typeof formData.get("insurance") === "string" ? formData.get("insurance") : "0",
    estimatedDeliveryDate: optionalString(formData.get("estimatedDeliveryDate")),
    deliveredDate: optionalString(formData.get("deliveredDate")),
    details: optionalString(formData.get("details")),
    status: formData.get("status") ?? "PENDING",
  });

  if (!parsed.success) {
    return { error: errorMessage(parsed.error) };
  }

  const data = parsed.data;

  const sale = await prisma.sale.findUnique({ where: { id: data.saleId } });
  if (!sale) return { error: "Venta no encontrada" };
  if (sale.status === "CANCELLED") {
    return { error: "No se puede despachar una venta cancelada" };
  }

  try {
    const shipment = await prisma.shipment.create({
      data: {
        saleId: data.saleId,
        shipmentDate: data.shipmentDate,
        carrier: data.carrier.trim(),
        trackingNumber: data.trackingNumber,
        shippingCost: decimal(data.shippingCost).toString(),
        insurance: decimal(data.insurance).toString(),
        estimatedDeliveryDate: data.estimatedDeliveryDate,
        deliveredDate: data.deliveredDate,
        details: data.details,
        status: data.status,
      },
    });

    await logAudit({
      entity: "Shipment",
      entityId: shipment.id,
      action: "CREATE",
      after: { id: shipment.id, saleId: shipment.saleId, carrier: shipment.carrier },
    });

    revalidatePath("/despachos");
    revalidatePath(`/ventas/${sale.id}`);
    return { success: true };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

const SHIPMENT_STATUSES = [
  "PENDING",
  "PREPARING",
  "DISPATCHED",
  "IN_TRANSIT",
  "DELIVERED",
  "RETURNED",
] as const;
type ShipmentStatusValue = (typeof SHIPMENT_STATUSES)[number];

function isShipmentStatus(value: string): value is ShipmentStatusValue {
  return (SHIPMENT_STATUSES as readonly string[]).includes(value);
}

export async function updateShipmentStatusAction(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const user = await requireUser();
  assertPermission(user, "shipments.manage");

  const id = formData.get("id");
  const statusRaw = formData.get("status");

  if (typeof id !== "string" || typeof statusRaw !== "string") {
    return { error: "Parámetros inválidos" };
  }
  if (!isShipmentStatus(statusRaw)) return { error: "Estado inválido" };

  const shipment = await prisma.shipment.findUnique({ where: { id } });
  if (!shipment) return { error: "Despacho no encontrado" };

  const before = { status: shipment.status };

  try {
    await prisma.shipment.update({
      where: { id },
      data: {
        status: statusRaw,
        deliveredDate:
          statusRaw === "DELIVERED" && shipment.deliveredDate === null
            ? new Date()
            : shipment.deliveredDate,
      },
    });

    await logAudit({
      entity: "Shipment",
      entityId: shipment.id,
      action: "UPDATE",
      before,
      after: { status: statusRaw },
    });

    revalidatePath("/despachos");
    revalidatePath(`/ventas/${shipment.saleId}`);
    return { success: true };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}