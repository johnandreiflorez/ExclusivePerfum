"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { logAudit } from "@/lib/audit";
import { requireUser, assertPermission } from "@/lib/auth/guard";
import { productSchema } from "@/lib/validation/fase2";
import { decimal } from "@/lib/commercial/sale-calculations";

export type ProductActionState = {
  error?: string;
  success?: boolean;
};

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Datos inválidos";
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  ) {
    return "Ya existe un producto con ese SKU";
  }
  return "Ocurrió un error al guardar el producto";
}

function optionalString(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

export async function createProductAction(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const user = await requireUser();
  assertPermission(user, "products.manage");

  const parsed = productSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    description: optionalString(formData.get("description")),
    categoryId: optionalString(formData.get("categoryId")),
    brand: optionalString(formData.get("brand")),
    unit: formData.get("unit"),
    referenceCost: typeof formData.get("referenceCost") === "string" ? formData.get("referenceCost") : "0",
    referencePrice: typeof formData.get("referencePrice") === "string" ? formData.get("referencePrice") : "0",
    status: formData.get("status") ?? "ACTIVE",
  });

  if (!parsed.success) {
    return { error: errorMessage(parsed.error) };
  }

  const data = parsed.data;

  try {
    const product = await prisma.product.create({
      data: {
        sku: data.sku.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description,
        categoryId: data.categoryId,
        brand: data.brand,
        unit: data.unit,
        referenceCost: decimal(data.referenceCost).toString(),
        referencePrice: decimal(data.referencePrice).toString(),
        status: data.status,
      },
    });

    await logAudit({
      entity: "Product",
      entityId: product.id,
      action: "CREATE",
      after: { id: product.id, sku: product.sku, name: product.name },
    });

    revalidatePath("/productos");
    return { success: true };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

const PRODUCT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
type ProductStatusValue = (typeof PRODUCT_STATUSES)[number];

function isProductStatus(value: string): value is ProductStatusValue {
  return (PRODUCT_STATUSES as readonly string[]).includes(value);
}

export async function updateProductStatusAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  assertPermission(user, "products.manage");

  const id = formData.get("id");
  const statusRaw = formData.get("status");

  if (typeof id !== "string" || typeof statusRaw !== "string") return;
  if (!isProductStatus(statusRaw)) return;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return;

  const before = { status: product.status };

  await prisma.product.update({
    where: { id },
    data: { status: statusRaw },
  });

  await logAudit({
    entity: "Product",
    entityId: product.id,
    action: "UPDATE",
    before,
    after: { status: statusRaw },
  });

  revalidatePath("/productos");
}