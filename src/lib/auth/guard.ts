import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, hasPermission, type SessionUser } from "@/lib/auth/session";

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export function assertPermission(user: SessionUser, permissionKey: string) {
  if (!hasPermission(user, permissionKey)) {
    const error = new Error("PERMISSION_DENIED");
    error.name = "PermissionDeniedError";
    throw error;
  }
}

export function isPermissionDenied(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "PermissionDeniedError"
  );
}