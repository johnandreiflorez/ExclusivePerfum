import "server-only";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslation } from "@/lib/i18n";
import { prisma } from "@/lib/prisma/client";
import { Card, PageHeader, StatCard } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/money";
import { SecondaryLink } from "@/components/ui/buttons";
import { InvestorIcon } from "@/components/ui/icons";
import { Prisma } from "@/generated/prisma/client";
import {
  investmentBalance,
  capitalUtilizado,
  availableForPayout,
} from "@/lib/investor/calculations";

export default async function InvestorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = getTranslation;

  const investor = await prisma.investor.findUnique({
    where: { id },
    include: {
      investments: {
        orderBy: { investmentDate: "desc" },
        include: { createdBy: true },
      },
      participations: {
        orderBy: { sale: { saleDate: "desc" } },
        include: { sale: true },
      },
      profitDistributions: {
        orderBy: { generatedAt: "desc" },
        include: {
          saleInvestor: { include: { sale: true } },
          invoice: true,
        },
      },
    },
  });

  if (!investor) notFound();

  const balance = investmentBalance(investor.investments);
  const activeParticipations = investor.participations.filter(
    (p) => p.sale.status !== "CANCELLED",
  );
  const used = capitalUtilizado(activeParticipations);
  const available = balance.saldo.minus(used);

  const nonAnnulled = investor.profitDistributions.filter(
    (d) => d.status !== "ANULADA",
  );
  const zero = new Prisma.Decimal(0);
  const recognizedTotal = nonAnnulled.reduce(
    (acc, d) => acc.plus(d.recognizedAmount),
    zero,
  );
  const paidGains = nonAnnulled.reduce(
    (acc, d) => acc.plus(d.paidAmount),
    zero,
  );
  const pendingGains = nonAnnulled.reduce(
    (acc, d) => acc.plus(availableForPayout(d)),
    zero,
  );
  const profitability =
    balance.saldo.gt(0) ? recognizedTotal.dividedBy(balance.saldo).times(100) : null;

  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={investor.name}
        description={`${t("nav.investors")} — ${investor.entryDate.toLocaleDateString("es-CO")}`}
        icon={<InvestorIcon className="h-5 w-5" />}
        action={
          <div className="flex gap-2">
            <SecondaryLink href="/inversores" label={t("common.back")} />
            <SecondaryLink href={`/inversiones/nueva?investorId=${investor.id}`} label={t("investments.create")} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-gap lg:grid-cols-5">
        <StatCard
          label={t("investors.capital")}
          value={formatCurrency(balance.saldo)}
          hint={`${t("investors.aportes")}: ${formatCurrency(balance.aportes)} · ${t("investors.retiros")}: ${formatCurrency(balance.retiros)}`}
        />
        <StatCard
          label={t("investors.capitalUtilizado")}
          value={formatCurrency(used)}
          hint={t("investors.capitalDisponible")}
        />
        <StatCard
          label={t("investors.capitalDisponible")}
          value={formatCurrency(available)}
        />
        <StatCard
          label={t("investors.profits")}
          value={formatCurrency(recognizedTotal)}
          hint={`${t("investors.paidProfits")}: ${formatCurrency(paidGains)}`}
        />
        <StatCard
          label={t("investors.pendingProfits")}
          value={formatCurrency(pendingGains)}
          hint={profitability !== null ? `${t("investors.profitability")}: ${profitability.toDecimalPlaces(2).toString()}%` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-gap lg:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold text-text-main">{t("investors.investments")}</h2>
          {investor.investments.length === 0 ? (
            <p className="mt-2 text-sm text-text-faint">{t("investors.noInvestments")}</p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {investor.investments.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border-default px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-text-faint">
                      {t(`investments.type_${movement.type}`)}
                    </p>
                    <p className="truncate text-text-subtle">
                      {movement.investmentDate.toLocaleDateString("es-CO")}
                      {movement.reference ? ` · ${movement.reference}` : ""}
                    </p>
                  </div>
                  <p
                    className={`font-medium ${
                      movement.amount.gt(0) && ["APORTE", "AJUSTE"].includes(movement.type)
                        ? "text-status-success"
                        : "text-status-danger"
                    }`}
                  >
                    {formatCurrency(movement.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-text-main">{t("investors.participations")}</h2>
          {investor.participations.length === 0 ? (
            <p className="mt-2 text-sm text-text-faint">{t("investors.noParticipations")}</p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {investor.participations.map((participation) => (
                <Link
                  key={participation.id}
                  href={`/ventas/${participation.saleId}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border-default px-3 py-2 text-sm transition-colors hover:bg-surface-secondary"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-medium text-text-main">
                      {participation.sale.number}
                    </p>
                    <p className="truncate text-text-subtle">
                      {participation.sale.saleDate.toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-text-main">
                      {formatCurrency(participation.amount)}
                    </p>
                    <p className="text-xs text-text-faint">{participation.percentage.toString()}%</p>
                    <StatusBadge
                      status={participation.sale.status}
                      label={t(`sales.${participation.sale.status.toLowerCase()}`)}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-text-main">{t("profits.title")}</h2>
          {investor.profitDistributions.length === 0 ? (
            <p className="mt-2 text-sm text-text-faint">{t("profits.empty")}</p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {investor.profitDistributions.map((distribution) => (
                <div
                  key={distribution.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border-default px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-medium text-text-main">
                      {distribution.saleInvestor.sale.number}
                    </p>
                    <p className="text-xs text-text-faint">
                      {t("profits.recognized")}: {formatCurrency(distribution.recognizedAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-text-main">
                      {formatCurrency(availableForPayout(distribution))}
                    </p>
                    <StatusBadge
                      status={distribution.status}
                      label={t(`profits.status_${distribution.status}`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {investor.observations ? (
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-faint">
            {t("investors.observations")}
          </h2>
          <p className="mt-2 text-sm text-text-subtle">{investor.observations}</p>
        </Card>
      ) : null}
    </div>
  );
}