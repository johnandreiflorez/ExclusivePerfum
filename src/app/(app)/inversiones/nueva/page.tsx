import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { InvestmentsIcon } from "@/components/ui/icons";
import { InvestmentForm } from "../investment-form";

export default async function NewInvestmentPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "investments.manage")) redirect("/inversiones");

  const t = getTranslation;

  const investors = await prisma.investor.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("investments.create")}
        description={t("investments.title")}
        icon={<InvestmentsIcon className="h-5 w-5" />}
      />
      <Card>
        <InvestmentForm
          investors={investors.map((i) => ({ id: i.id, name: i.name }))}
        />
      </Card>
    </div>
  );
}