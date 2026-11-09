import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { PaymentsIcon } from "@/components/ui/icons";
import { PaymentForm } from "../payment-form";

export default async function NewPaymentPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "payments.manage")) redirect("/pagos");

  const t = getTranslation;

  const customers = await prisma.customer.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      invoices: {
        where: { status: { not: "ANNULLED" } },
        select: { id: true, number: true, total: true, paidAmount: true },
      },
    },
  });

  const withBalance = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      invoices: c.invoices
        .filter((inv) => Number(inv.total) - Number(inv.paidAmount) > 0)
        .map((inv) => ({
          id: inv.id,
          number: inv.number,
          balance: (Number(inv.total) - Number(inv.paidAmount)).toString(),
        })),
    }))
    .filter((c) => c.invoices.length > 0);

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("payments.create")}
        description={t("payments.title")}
        icon={<PaymentsIcon className="h-5 w-5" />}
      />
      <Card>
        <PaymentForm customers={withBalance} />
      </Card>
    </div>
  );
}