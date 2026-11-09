"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";

export function InvestorFilterSelect({
  current,
  investors,
}: {
  current: string | undefined;
  investors: { id: string; name: string }[];
}) {
  const t = useTranslation();
  const router = useRouter();

  function onFilterChange(value: string) {
    const query = new URLSearchParams();
    if (value) query.set("inversor", value);
    router.replace(`/ganancias${query.toString() ? `?${query.toString()}` : ""}`);
  }

  return (
    <select
      defaultValue={current ?? ""}
      onChange={(e) => onFilterChange(e.target.value)}
      className="w-full rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-main shadow-card outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 sm:w-64"
    >
      <option value="">{t("profits.allInvestors")}</option>
      {investors.map((investor) => (
        <option key={investor.id} value={investor.id}>
          {investor.name}
        </option>
      ))}
    </select>
  );
}