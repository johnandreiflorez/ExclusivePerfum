import "server-only";
import Link from "next/link";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader, EmptyState } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/money";
import { CreateLink } from "@/components/ui/buttons";
import { ProductsIcon } from "@/components/ui/icons";

export default async function ProductsPage() {
  const t = getTranslation;

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: { category: true },
  });

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={t("nav.products")}
        description={t("products.title")}
        icon={<ProductsIcon className="h-5 w-5" />}
        action={<CreateLink href="/productos/nuevo" label={t("products.create")} />}
      />

      {products.length === 0 ? (
        <EmptyState message={t("products.empty")} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">{t("products.sku")}</th>
                <th className="px-6 py-3 font-medium">{t("products.name")}</th>
                <th className="px-6 py-3 font-medium">{t("products.category")}</th>
                <th className="px-6 py-3 font-medium">{t("products.referenceCost")}</th>
                <th className="px-6 py-3 font-medium">{t("products.referencePrice")}</th>
                <th className="px-6 py-3 font-medium">{t("products.status")}</th>
                <th className="px-6 py-3 font-medium">{t("common.details")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-border-default last:border-0 hover:bg-surface-secondary"
                >
                  <td className="px-6 py-3 font-mono text-xs font-medium text-text-subtle">
                    {product.sku}
                  </td>
                  <td className="px-6 py-3 font-medium text-text-main">{product.name}</td>
                  <td className="px-6 py-3 text-text-subtle">
                    {product.category?.name ?? t("products.noCategory")}
                  </td>
                  <td className="px-6 py-3 text-text-subtle">
                    {formatCurrency(product.referenceCost)}
                  </td>
                  <td className="px-6 py-3 text-text-main">
                    {formatCurrency(product.referencePrice)}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge
                      status={product.status}
                      label={t(`products.${product.status.toLowerCase()}`)}
                    />
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/productos/${product.id}`}
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