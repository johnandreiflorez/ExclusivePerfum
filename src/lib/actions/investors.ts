"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { logAudit } from "@/lib/audit";
import { requireUser, assertPermission } from "@/lib/auth/guard";
import { investorSchema, investmentSchema } from "@/lib/validation/fase4";
import { decimal } from "@/lib/investor/calculations";

export type InvestorActionState = {
  error?: string;
  success?: boolean;
};

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Datos inválidos";
  }
  return "Ocurrió un error al guardar";
}

function optionalString(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

export async function createInvestorAction(
  _prevState: InvestorActionState,
  formData: FormData,
): Promise<InvestorActionState> {
  const user = await requireUser();
  assertPermission(user, "investors.manage");

  const parsed = investorSchema.safeParse({
    name: formData.get("name"),
    documentType: formData.get("documentType") || undefined,
    documentNumber: optionalString(formData.get("documentNumber")),
    phone: optionalString(formData.get("phone")),
    email: optionalString(formData.get("email")),
    entryDate: formData.get("entryDate") ?? new Date().toISOString().slice(0, 10),
    status: formData.get("status") ?? "ACTIVE",
    observations: optionalString(formData.get("observations")),
  });

  if (!parsed.success) {
    return { error: errorMessage(parsed.error) };
  }

  const data = parsed.data;

  try {
    const investor = await prisma.investor.create({
      data: {
        name: data.name.trim(),
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        phone: data.phone,
        email: data.email,
        entryDate: data.entryDate,
        status: data.status,
        observations: data.observations,
      },
    });

    await logAudit({
      entity: "Investor",
      entityId: investor.id,
      action: "CREATE",
      after: { id: investor.id, name: investor.name, status: investor.status },
    });

    revalidatePath("/inversores");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function createInvestmentAction(
  _prevState: InvestorActionState,
  formData: FormData,
): Promise<InvestorActionState> {
  const user = await requireUser();
  assertPermission(user, "investments.manage");

  const parsed = investmentSchema.safeParse({
    investorId: formData.get("investorId"),
    investmentDate:
      formData.get("investmentDate") ?? new Date().toISOString().slice(0, 10),
    type: formData.get("type") ?? "APORTE",
    amount: formData.get("amount"),
    reference: optionalString(formData.get("reference")),
    observations: optionalString(formData.get("observations")),
  });

  if (!parsed.success) {
    return { error: errorMessage(parsed.error) };
  }

  const data = parsed.data;

  const amount = decimal(data.amount);
  if (amount.isZero()) {
    return { error: "El valor debe ser diferente de 0" };
  }
  if (data.type !== "AJUSTE" && amount.lt(0)) {
    return { error: "El valor no puede ser negativo" };
  }

  const investor = await prisma.investor.findUnique({
    where: { id: data.investorId },
  });
  if (!investor) return { error: "Inversor no encontrado" };

  try {
    const investment = await prisma.investment.create({
      data: {
        investorId: investor.id,
        investmentDate: data.investmentDate,
        type: data.type,
        amount: amount.toString(),
        reference: data.reference,
        observations: data.observations,
        createdById: user.id,
      },
    });

    await logAudit({
      entity: "Investment",
      entityId: investment.id,
      action: "CREATE",
      after: {
        id: investment.id,
        investorId: investor.id,
        type: data.type,
        amount: amount.toString(),
      },
    });

    revalidatePath("/inversiones");
    revalidatePath(`/inversores/${investor.id}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}