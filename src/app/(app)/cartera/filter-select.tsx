"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";

export function CustomerFilterSelect({
  status,
  current,
  customers,
}: {
  status: string;
  current: string | undefined;
  customers: { id: string; name: string }[];
}) {
  const t = useTranslation();
  const router = useRouter();

  function onFilterChange(value: string) {
    const query = new URLSearchParams({ estado: status });
    if (value) query.set("cliente", value);
    router.replace(`/cartera?${query.toString()}`);
  }

  return (
    <select
      defaultValue={current ?? ""}
      onChange={(e) => onFilterChange(e.target.value)}
      className="w-full rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-main shadow-card outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 sm:w-64"
    >
      <option value="">{t("portfolio.filterCustomer")}</option>
      {customers.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}