import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "products.manage")) redirect("/productos");

  const t = getTranslation;

  const categories = await prisma.productCategory.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("products.create")}
        description={t("products.title")}
      />
      <Card>
        <ProductForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </Card>
    </div>
  );
}