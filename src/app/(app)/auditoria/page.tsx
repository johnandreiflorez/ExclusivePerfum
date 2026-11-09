import "server-only";
import { prisma } from "@/lib/prisma/client";
import { getTranslation } from "@/lib/i18n";
import { Card, PageHeader } from "@/components/ui/layout";
import { AuditIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });

  if (logs.length === 0) {
    return (
      <div className="flex flex-col gap-gap">
        <PageHeader
          title={getTranslation("audit.title")}
          icon={<AuditIcon className="h-5 w-5" />}
        />
        <Card>
          <p className="text-sm text-text-subtle">
            {getTranslation("audit.empty")}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={getTranslation("audit.title")}
        icon={<AuditIcon className="h-5 w-5" />}
      />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
              <th className="px-6 py-3 font-medium">{getTranslation("audit.createdAt")}</th>
              <th className="px-6 py-3 font-medium">{getTranslation("audit.user")}</th>
              <th className="px-6 py-3 font-medium">{getTranslation("audit.entity")}</th>
              <th className="px-6 py-3 font-medium">{getTranslation("audit.action")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-b border-border-default last:border-0 hover:bg-surface-secondary"
              >
                <td className="px-6 py-3 text-text-subtle">
                  {log.createdAt.toLocaleString("es-CO")}
                </td>
                <td className="px-6 py-3 text-text-main">
                  {log.user?.name ?? "—"}
                </td>
                <td className="px-6 py-3 text-text-main">{log.entity}</td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-medium text-text-main">
                    {log.action}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}