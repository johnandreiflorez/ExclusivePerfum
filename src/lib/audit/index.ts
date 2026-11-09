import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma/client";
import { getSessionUser } from "@/lib/auth/session";
import { Prisma } from "@/generated/prisma/client";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "CANCEL"
  | "LOGIN"
  | "LOGOUT"
  | "PAYMENT_REGISTER"
  | "PAYMENT_APPLY"
  | "INVOICE_UPDATE"
  | "INVESTMENT_REGISTER"
  | "PROFIT_REGISTER"
  | "INVESTOR_PAYMENT";

export async function logAudit(params: {
  entity: string;
  entityId?: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  userId?: string;
}) {
  let userId = params.userId;

  if (!userId) {
    const user = await getSessionUser();
    userId = user?.id;
  }

  const ipAddress = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();

  const toJson = (value: unknown): Prisma.InputJsonValue | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return "null" as unknown as Prisma.InputJsonValue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  };

  await prisma.auditLog.create({
    data: {
      userId,
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      before: toJson(params.before),
      after: toJson(params.after),
      ipAddress,
    },
  });
}