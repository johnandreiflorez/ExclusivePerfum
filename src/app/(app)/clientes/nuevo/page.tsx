import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/session";
import { getTranslation } from "@/lib/i18n";
import { Card, PageHeader } from "@/components/ui/layout";
import { CustomerForm } from "../customer-form";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "customers.create")) redirect("/clientes");

  const { redirectTo } = await searchParams;
  const t = getTranslation;

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("customers.create")}
        description={t("customers.title")}
      />
      <Card>
        <CustomerForm createUrl={redirectTo ?? "/clientes"} />
      </Card>
    </div>
  );
}