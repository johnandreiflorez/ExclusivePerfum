import "server-only";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { getTranslation } from "@/lib/i18n";
import { Card, PageHeader, EmptyState } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { CreateLink } from "@/components/ui/buttons";
import { CustomersIcon } from "@/components/ui/icons";

export default async function CustomersPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const canCreate = hasPermission(user, "customers.create");

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sales: true } } },
  });

  const t = getTranslation;

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("nav.customers")}
        description={t("customers.title")}
        icon={<CustomersIcon className="h-5 w-5" />}
        action={
          canCreate ? (
            <CreateLink href="/clientes/nuevo" label={t("customers.create")} />
          ) : null
        }
      />

      {customers.length === 0 ? (
        <EmptyState message={t("customers.empty")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">{t("customers.name")}</th>
                <th className="px-6 py-3 font-medium">{t("customers.documentType")}</th>
                <th className="px-6 py-3 font-medium">{t("customers.documentNumber")}</th>
                <th className="px-6 py-3 font-medium">{t("customers.status")}</th>
                <th className="px-6 py-3 font-medium">{t("common.details")}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-border-default last:border-0 hover:bg-surface-secondary"
                >
                  <td className="px-6 py-3 font-medium text-text-main">{customer.name}</td>
                  <td className="px-6 py-3 text-text-subtle">
                    {t(`customers.${customer.documentType.toLowerCase()}`)}
                  </td>
                  <td className="px-6 py-3 text-text-subtle">{customer.documentNumber}</td>
                  <td className="px-6 py-3">
                    <StatusBadge
                      status={customer.status}
                      label={t(`customers.${customer.status.toLowerCase()}`)}
                    />
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/clientes/${customer.id}`}
                      className="font-medium text-brand-600 hover:text-brand-700"
                    >
                      {t("common.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}