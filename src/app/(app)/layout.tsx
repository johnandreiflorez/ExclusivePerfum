import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";

function flattenPermissions(user: Awaited<ReturnType<typeof getSessionUser>>): string[] {
  if (!user) return [];
  const keys: string[] = [];
  for (const userRole of user.roles) {
    for (const permission of userRole.role.permissions) {
      if (!keys.includes(permission.key)) keys.push(permission.key);
    }
  }
  return keys;
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <AppShell user={user} permissions={flattenPermissions(user)}>{children}</AppShell>;
}