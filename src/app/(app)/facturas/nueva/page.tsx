import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { InvoiceIcon } from "@/components/ui/icons";
import { InvoiceForm } from "../invoice-form";

export default async function NewInvoicePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "invoices.manage")) redirect("/facturas");

  const t = getTranslation;

  const sales = await prisma.sale.findMany({
    where: {
      status: { not: "CANCELLED" },
      invoices: { none: { status: { not: "ANNULLED" } } },
    },
    orderBy: { saleDate: "desc" },
    include: { customer: true },
  });

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("invoices.create")}
        description={t("invoices.title")}
        icon={<InvoiceIcon className="h-5 w-5" />}
      />
      <Card>
        {sales.length === 0 ? (
          <p className="text-sm text-text-faint">{t("invoices.noAvailableSales")}</p>
        ) : (
          <InvoiceForm
            sales={sales.map((s) => ({
              id: s.id,
              number: s.number,
              customerName: s.customer.name,
              subtotal: s.subtotal.toString(),
            }))}
          />
        )}
      </Card>
    </div>
  );
}