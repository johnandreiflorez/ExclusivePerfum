import "server-only";
import { prisma } from "@/lib/prisma/client";
import { getTranslation } from "@/lib/i18n";
import { Card, PageHeader } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { UsersIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      roles: { include: { role: true } },
    },
  });

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={getTranslation("users.title")}
        icon={<UsersIcon className="h-5 w-5" />}
      />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
              <th className="px-6 py-3 font-medium">{getTranslation("users.name")}</th>
              <th className="px-6 py-3 font-medium">{getTranslation("users.email")}</th>
              <th className="px-6 py-3 font-medium">{getTranslation("users.roles")}</th>
              <th className="px-6 py-3 font-medium">{getTranslation("users.status")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border-default last:border-0 hover:bg-surface-secondary"
              >
                <td className="px-6 py-3 font-medium text-text-main">
                  {user.name}
                </td>
                <td className="px-6 py-3 text-text-subtle">{user.email}</td>
                <td className="px-6 py-3 text-text-subtle">
                  {user.roles.map((r) => r.role.name).join(", ") || "—"}
                </td>
                <td className="px-6 py-3">
                  <StatusBadge status={user.status} label={user.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}