import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { getTranslation } from "@/lib/i18n";
import { Card, PageHeader } from "@/components/ui/layout";
import { InvestorIcon } from "@/components/ui/icons";
import { InvestorForm } from "../investor-form";

export default async function NewInvestorPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "investors.manage")) redirect("/inversores");

  const t = getTranslation;

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("investors.create")}
        description={t("investors.title")}
        icon={<InvestorIcon className="h-5 w-5" />}
      />
      <Card>
        <InvestorForm />
      </Card>
    </div>
  );
}