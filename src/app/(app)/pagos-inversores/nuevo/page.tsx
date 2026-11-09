import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { InvestorPaymentsIcon } from "@/components/ui/icons";
import { availableForPayout } from "@/lib/investor/calculations";
import { InvestorPaymentForm } from "../investor-payment-form";

export default async function NewInvestorPaymentPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "profits.manage")) redirect("/pagos-inversores");

  const t = getTranslation;

  const investors = await prisma.investor.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      profitDistributions: {
        where: { status: { in: ["GENERADA", "PENDIENTE_PAGO"] } },
        include: { saleInvestor: { include: { sale: true } } },
      },
    },
  });

  const withGains = investors
    .map((investor) => ({
      id: investor.id,
      name: investor.name,
      gains: investor.profitDistributions
        .map((distribution) => ({
          id: distribution.id,
          saleNumber: distribution.saleInvestor.sale.number,
          available: availableForPayout(distribution).toString(),
        }))
        .filter((gain) => Number(gain.available) > 0),
    }))
    .filter((investor) => investor.gains.length > 0);

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("investorPayments.create")}
        description={t("investorPayments.title")}
        icon={<InvestorPaymentsIcon className="h-5 w-5" />}
      />
      <Card>
        <InvestorPaymentForm investors={withGains} />
      </Card>
    </div>
  );
}