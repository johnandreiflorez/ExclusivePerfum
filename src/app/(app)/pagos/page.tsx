import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslation } from "@/lib/i18n";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader, EmptyState } from "@/components/ui/layout";
import { formatCurrency } from "@/lib/money";
import { CreateLink } from "@/components/ui/buttons";
import { PaymentsIcon } from "@/components/ui/icons";

export default async function PaymentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "payments.view")) redirect("/dashboard");

  const t = getTranslation;

  const payments = await prisma.payment.findMany({
    orderBy: { paymentDate: "desc" },
    include: { customer: true, allocations: true },
  });

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("nav.payments")}
        description={t("payments.title")}
        icon={<PaymentsIcon className="h-5 w-5" />}
        action={
          hasPermission(user, "payments.manage") ? (
            <CreateLink href="/pagos/nuevo" label={t("payments.create")} />
          ) : undefined
        }
      />

      {payments.length === 0 ? (
        <EmptyState message={t("payments.empty")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">{t("payments.number")}</th>
                <th className="px-6 py-3 font-medium">{t("payments.customer")}</th>
                <th className="px-6 py-3 font-medium">{t("payments.date")}</th>
                <th className="px-6 py-3 font-medium">{t("payments.method")}</th>
                <th className="px-6 py-3 font-medium">{t("payments.amount")}</th>
                <th className="px-6 py-3 font-medium">{t("payments.allocations")}</th>
                <th className="px-6 py-3 font-medium">{t("common.details")}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-border-default last:border-0 hover:bg-surface-secondary"
                >
                  <td className="px-6 py-3 font-mono text-xs font-medium text-text-main">
                    {payment.number}
                  </td>
                  <td className="px-6 py-3 text-text-main">{payment.customer.name}</td>
                  <td className="px-6 py-3 text-text-subtle">
                    {payment.paymentDate.toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-6 py-3 text-text-subtle">
                    {t(`payments.method_${payment.method}`)}
                  </td>
                  <td className="px-6 py-3 text-text-main">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-3 text-text-subtle">
                    {payment.allocations.length}
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/pagos/${payment.id}`}
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