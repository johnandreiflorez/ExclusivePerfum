"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { logAudit } from "@/lib/audit";
import { requireUser, assertPermission } from "@/lib/auth/guard";
import { customerSchema } from "@/lib/validation/fase2";

export type CustomerActionState = {
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
    return "Ya existe un cliente con ese número de documento";
  }
  return "Ocurrió un error al guardar el cliente";
}

function optionalString(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

export async function createCustomerAction(
  _prevState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser();
  assertPermission(user, "customers.create");

  const parsed = customerSchema.safeParse({
    documentType: formData.get("documentType"),
    documentNumber: formData.get("documentNumber"),
    name: formData.get("name"),
    phone: optionalString(formData.get("phone")),
    email: optionalString(formData.get("email")),
    address: optionalString(formData.get("address")),
    city: optionalString(formData.get("city")),
    department: optionalString(formData.get("department")),
    observations: optionalString(formData.get("observations")),
    status: formData.get("status") ?? "ACTIVE",
  });

  if (!parsed.success) {
    return { error: errorMessage(parsed.error) };
  }

  const data = parsed.data;

  try {
    const customer = await prisma.customer.create({
      data: {
        documentType: data.documentType,
        documentNumber: data.documentNumber.trim(),
        name: data.name.trim(),
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        department: data.department,
        observations: data.observations,
        status: data.status,
      },
    });

    await logAudit({
      entity: "Customer",
      entityId: customer.id,
      action: "CREATE",
      after: { id: customer.id, name: customer.name, documentNumber: customer.documentNumber },
    });

    revalidatePath("/clientes");
    return { success: true };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

const CUSTOMER_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;
type CustomerStatusValue = (typeof CUSTOMER_STATUSES)[number];

function isCustomerStatus(value: string): value is CustomerStatusValue {
  return (CUSTOMER_STATUSES as readonly string[]).includes(value);
}

export async function updateCustomerStatusAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  assertPermission(user, "customers.manage");

  const id = formData.get("id");
  const statusRaw = formData.get("status");

  if (typeof id !== "string" || typeof statusRaw !== "string") return;

  if (!isCustomerStatus(statusRaw)) return;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return;

  const before = { status: customer.status };

  await prisma.customer.update({
    where: { id },
    data: { status: statusRaw },
  });

  await logAudit({
    entity: "Customer",
    entityId: customer.id,
    action: "UPDATE",
    before,
    after: { status: statusRaw },
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${customer.id}`);
}