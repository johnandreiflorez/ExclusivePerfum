import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { SaleForm } from "./sale-form";

export default async function NewSalePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "sales.create")) redirect("/ventas");

  const t = getTranslation;

  const [customers, products, investors] = await Promise.all([
    prisma.customer.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.investor.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("sales.create")}
        description={t("sales.title")}
      />
      <Card>
        <SaleForm
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            referencePrice: p.referencePrice.toString(),
            referenceCost: p.referenceCost.toString(),
          }))}
          investors={investors.map((i) => ({ id: i.id, name: i.name }))}
        />
      </Card>
    </div>
  );
}