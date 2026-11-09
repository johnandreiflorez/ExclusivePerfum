"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import {
  createInvestorPaymentAction,
  type InvestorPaymentActionState,
} from "@/lib/actions/investor-payments";
import {
  Field,
  TextInput,
  SelectInput,
  TextArea,
  SubmitButton,
  FormError,
} from "@/components/ui/form";
import { PlusIcon } from "@/components/ui/icons";

const initialState: InvestorPaymentActionState = {};

type GainOption = {
  id: string;
  saleNumber: string;
  available: string;
};

type InvestorOption = {
  id: string;
  name: string;
  gains: GainOption[];
};

type AllocationRow = {
  key: number;
  profitDistributionId: string;
  amount: string;
};

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function toNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function InvestorPaymentForm({
  investors,
}: {
  investors: InvestorOption[];
}) {
  const t = useTranslation();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createInvestorPaymentAction,
    initialState,
  );

  const [investorId, setInvestorId] = useState("");
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [keyCounter, setKeyCounter] = useState(1);

  useEffect(() => {
    if (state.success) router.push("/pagos-inversores");
  }, [state.success, router]);

  const investor = investors.find((i) => i.id === investorId);
  const gains = useMemo(() => investor?.gains ?? [], [investor]);

  function handleInvestorChange(id: string) {
    setInvestorId(id);
    setRows([]);
  }

  function addAllocation() {
    setRows((prev) => [
      ...prev,
      { key: keyCounter, profitDistributionId: "", amount: "" },
    ]);
    setKeyCounter((k) => k + 1);
  }

  function removeAllocation(key: number) {
    setRows((prev) => prev.filter((row) => row.key !== key));
  }

  function updateRow(key: number, patch: Partial<AllocationRow>) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  const gainById = useMemo(() => {
    const map = new Map<string, GainOption>();
    for (const gain of gains) map.set(gain.id, gain);
    return map;
  }, [gains]);

  const total = rows.reduce((acc, row) => acc + toNumber(row.amount), 0);

  const allocationsJson = JSON.stringify(
    rows
      .filter((row) => row.profitDistributionId && toNumber(row.amount) > 0)
      .map((row) => ({
        profitDistributionId: row.profitDistributionId,
        amount: toNumber(row.amount),
      })),
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-gap">
      <div className="grid grid-cols-1 gap-gap sm:grid-cols-2">
        <Field label={t("investorPayments.investor")} required>
          <SelectInput
            name="investorId"
            required
            defaultValue=""
            value={investorId}
            onChange={(e) => handleInvestorChange(e.target.value)}
          >
            <option value="" disabled>
              {t("investorPayments.selectInvestor")}
            </option>
            {investors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label={t("investorPayments.date")} required>
          <TextInput
            name="paymentDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </Field>

        <Field label={t("investorPayments.method")} required>
          <SelectInput name="method" defaultValue="CASH">
            <option value="CASH">{t("investorPayments.method_CASH")}</option>
            <option value="TRANSFER">{t("investorPayments.method_TRANSFER")}</option>
            <option value="DEPOSIT">{t("investorPayments.method_DEPOSIT")}</option>
            <option value="CARD">{t("investorPayments.method_CARD")}</option>
            <option value="OTHER">{t("investorPayments.method_OTHER")}</option>
          </SelectInput>
        </Field>

        <Field label={t("investorPayments.reference")}>
          <TextInput name="reference" />
        </Field>
      </div>

      <Field label={t("investorPayments.observations")}>
        <TextArea name="observations" rows={2} />
      </Field>

      <input type="hidden" name="allocations" value={allocationsJson} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-main">
            {t("investorPayments.applyTo")}
          </h2>
          <button
            type="button"
            onClick={addAllocation}
            disabled={!investor || gains.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-700 shadow-card transition-all hover:bg-brand-50 active:scale-[0.98] disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            {t("investorPayments.addAllocation")}
          </button>
        </div>

        {!investor ? (
          <p className="text-sm text-text-faint">{t("investorPayments.selectInvestor")}</p>
        ) : gains.length === 0 ? (
          <p className="text-sm text-text-faint">{t("investorPayments.noGains")}</p>
        ) : (
          rows.map((row) => {
            const gain = row.profitDistributionId
              ? gainById.get(row.profitDistributionId)
              : undefined;
            return (
              <div
                key={row.key}
                className="grid grid-cols-12 items-end gap-gap rounded-lg border border-border-default p-4"
              >
                <div className="col-span-12 sm:col-span-6">
                  <Field label={t("investorPayments.gain")}>
                    <SelectInput
                      value={row.profitDistributionId}
                      onChange={(e) =>
                        updateRow(row.key, { profitDistributionId: e.target.value })
                      }
                    >
                      <option value="" disabled>
                        {t("investorPayments.gain")}
                      </option>
                      {gains.map((gain) => (
                        <option key={gain.id} value={gain.id}>
                          {gain.saleNumber} — {t("investorPayments.available")}:{" "}
                          {currency.format(toNumber(gain.available))}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>
                <div className="col-span-5 sm:col-span-3">
                  <Field label={t("investorPayments.toApply")}>
                    <TextInput
                      inputMode="decimal"
                      value={row.amount}
                      onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="col-span-7 sm:col-span-2">
                  <p className="pb-2.5 text-xs text-text-faint">
                    {gain
                      ? `${t("investorPayments.available")}: ${currency.format(toNumber(gain.available))}`
                      : ""}
                  </p>
                </div>
                <div className="col-span-12 sm:col-span-1">
                  <button
                    type="button"
                    onClick={() => removeAllocation(row.key)}
                    className="rounded-lg border border-border-default px-2 py-2 text-xs font-medium text-status-danger shadow-card transition-all hover:bg-surface-tertiary active:scale-[0.98]"
                  >
                    {t("investorPayments.removeAllocation")}
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <p className="text-xs uppercase tracking-wide text-brand-700">
            {t("investorPayments.appliedTotal")}
          </p>
          <p className="mt-1 text-xl font-bold text-brand-800">{currency.format(total)}</p>
        </div>
      </div>

      <FormError message={state.error} />

      <div className="w-full sm:w-56">
        <SubmitButton
          label={t("investorPayments.create")}
          pendingLabel={t("common.loading")}
          pending={pending}
        />
      </div>
    </form>
  );
}