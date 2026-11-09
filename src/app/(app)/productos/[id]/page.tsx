import "server-only";
import { notFound } from "next/navigation";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/money";
import { SecondaryLink } from "@/components/ui/buttons";
import { ProductStatusAction } from "./product-status-action";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = getTranslation;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!product) notFound();

  const rows = [
    { label: t("products.sku"), value: product.sku },
    { label: t("products.category"), value: product.category?.name ?? t("products.noCategory") },
    { label: t("products.brand"), value: product.brand ?? "—" },
    { label: t("products.unit"), value: t(`products.unit_${product.unit}`) },
    { label: t("products.referenceCost"), value: formatCurrency(product.referenceCost) },
    { label: t("products.referencePrice"), value: formatCurrency(product.referencePrice) },
  ];

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={product.name}
        description={product.sku}
        action={
          <SecondaryLink href="/productos" label={t("common.back")} />
        }
      />

      <div className="grid grid-cols-1 gap-gap lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-main">{product.name}</h2>
            <StatusBadge
              status={product.status}
              label={t(`products.${product.status.toLowerCase()}`)}
            />
          </div>
          <dl className="mt-4 flex flex-col gap-2 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <dt className="text-text-subtle">{row.label}</dt>
                <dd className="text-right font-medium text-text-main">{row.value}</dd>
              </div>
            ))}
          </dl>
          {product.description ? (
            <>
              <h3 className="mt-6 text-sm font-semibold text-text-main">
                {t("products.description")}
              </h3>
              <p className="mt-1 text-sm text-text-subtle">{product.description}</p>
            </>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-text-main">{t("common.actions")}</h2>
          <div className="mt-4">
            <ProductStatusAction
              productId={product.id}
              currentStatus={product.status}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}