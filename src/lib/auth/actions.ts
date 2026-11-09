"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginErrorKey = "auth.invalidCredentials" | "auth.inactiveUser";
export type LoginState = { error?: LoginErrorKey };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "auth.invalidCredentials" };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || user.status === "INACTIVE" || user.status === "BLOCKED") {
    return { error: "auth.inactiveUser" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "auth.invalidCredentials" };
  }

  await createSession(user.id);
  await logAudit({
    entity: "User",
    entityId: user.id,
    action: "LOGIN",
    userId: user.id,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const sessionUser = await import("@/lib/auth/session").then((m) =>
    m.getSessionUser(),
  );
  await logAudit({
    entity: "User",
    entityId: sessionUser?.id,
    action: "LOGOUT",
    userId: sessionUser?.id,
  });
  await destroySession();
  redirect("/login");
}