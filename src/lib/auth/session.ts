import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

export const SESSION_COOKIE = "exclusive_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  status: true,
  roles: {
    include: {
      role: {
        include: {
          permissions: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

export type SessionUser = Pick<
  Prisma.UserGetPayload<{ select: typeof SESSION_USER_SELECT }>,
  "id" | "email" | "name" | "status"
> & {
  roles: Prisma.UserGetPayload<{ select: typeof SESSION_USER_SELECT }>["roles"];
};

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: { token, userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: SESSION_USER_SELECT,
      },
    },
  });

  if (session === null) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export function hasPermission(
  user: SessionUser,
  permissionKey: string,
): boolean {
  return user.roles.some((userRole) =>
    userRole.role.permissions.some(
      (permission) => permission.key === permissionKey,
    ),
  );
}

export function hasRole(user: SessionUser, roleName: string): boolean {
  return user.roles.some((userRole) => userRole.role.name === roleName);
}