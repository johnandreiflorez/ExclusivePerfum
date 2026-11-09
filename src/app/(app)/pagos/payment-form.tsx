"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import { createPaymentAction, type PaymentActionState } from "@/lib/actions/payments";
import {
  Field,
  TextInput,
  SelectInput,
  TextArea,
  SubmitButton,
  FormError,
} from "@/components/ui/form";
import { PlusIcon } from "@/components/ui/icons";

const initialState: PaymentActionState = {};

type InvoiceOption = {
  id: string;
  number: string;
  balance: string;
};

type CustomerOption = {
  id: string;
  name: string;
  invoices: InvoiceOption[];
};

type AllocationRow = {
  key: number;
  invoiceId: string;
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

export function PaymentForm({ customers }: { customers: CustomerOption[] }) {
  const t = useTranslation();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createPaymentAction, initialState);

  const [customerId, setCustomerId] = useState("");
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [keyCounter, setKeyCounter] = useState(1);

  useEffect(() => {
    if (state.success) router.push("/pagos");
  }, [state.success, router]);

  const customer = customers.find((c) => c.id === customerId);
  const invoices = useMemo(() => customer?.invoices ?? [], [customer]);

  function handleCustomerChange(id: string) {
    setCustomerId(id);
    setRows([]);
  }

  function addAllocation() {
    setRows((prev) => [
      ...prev,
      { key: keyCounter, invoiceId: "", amount: "" },
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

  const invoiceById = useMemo(() => {
    const map = new Map<string, InvoiceOption>();
    for (const inv of invoices) map.set(inv.id, inv);
    return map;
  }, [invoices]);

  const total = rows.reduce((acc, row) => acc + toNumber(row.amount), 0);

  const allocationsJson = JSON.stringify(
    rows
      .filter((row) => row.invoiceId && toNumber(row.amount) > 0)
      .map((row) => ({ invoiceId: row.invoiceId, amount: toNumber(row.amount) })),
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-gap">
      <div className="grid grid-cols-1 gap-gap sm:grid-cols-2">
        <Field label={t("payments.customer")} required>
          <SelectInput
            name="customerId"
            required
            defaultValue=""
            value={customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
          >
            <option value="" disabled>
              {t("payments.selectCustomer")}
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label={t("payments.date")} required>
          <TextInput
            name="paymentDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </Field>

        <Field label={t("payments.method")} required>
          <SelectInput name="method" defaultValue="CASH">
            <option value="CASH">{t("payments.method_CASH")}</option>
            <option value="TRANSFER">{t("payments.method_TRANSFER")}</option>
            <option value="DEPOSIT">{t("payments.method_DEPOSIT")}</option>
            <option value="CARD">{t("payments.method_CARD")}</option>
            <option value="PSE">{t("payments.method_PSE")}</option>
            <option value="OTHER">{t("payments.method_OTHER")}</option>
          </SelectInput>
        </Field>

        <Field label={t("payments.reference")}>
          <TextInput name="reference" />
        </Field>
      </div>

      <Field label={t("payments.observations")}>
        <TextArea name="observations" rows={2} />
      </Field>

      <input type="hidden" name="allocations" value={allocationsJson} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-main">
            {t("payments.applyTo")}
          </h2>
          <button
            type="button"
            onClick={addAllocation}
            disabled={!customer || invoices.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-700 shadow-card transition-all hover:bg-brand-50 active:scale-[0.98] disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            {t("payments.addAllocation")}
          </button>
        </div>

        {!customer ? (
          <p className="text-sm text-text-faint">{t("payments.selectCustomer")}</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-text-faint">{t("payments.noInvoices")}</p>
        ) : (
          rows.map((row) => {
            const inv = row.invoiceId ? invoiceById.get(row.invoiceId) : undefined;
            return (
              <div
                key={row.key}
                className="grid grid-cols-12 items-end gap-gap rounded-lg border border-border-default p-4"
              >
                <div className="col-span-12 sm:col-span-6">
                  <Field label={t("payments.invoice")}>
                    <SelectInput
                      value={row.invoiceId}
                      onChange={(e) => updateRow(row.key, { invoiceId: e.target.value })}
                    >
                      <option value="" disabled>
                        {t("payments.invoice")}
                      </option>
                      {invoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.number} — {t("payments.balance")}:{" "}
                          {currency.format(toNumber(invoice.balance))}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>
                <div className="col-span-5 sm:col-span-3">
                  <Field label={t("payments.toApply")}>
                    <TextInput
                      inputMode="decimal"
                      value={row.amount}
                      onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="col-span-7 sm:col-span-2">
                  <p className="pb-2.5 text-xs text-text-faint">
                    {inv ? `${t("invoices.balance")}: ${currency.format(toNumber(inv.balance))}` : ""}
                  </p>
                </div>
                <div className="col-span-12 sm:col-span-1">
                  <button
                    type="button"
                    onClick={() => removeAllocation(row.key)}
                    className="rounded-lg border border-border-default px-2 py-2 text-xs font-medium text-status-danger shadow-card transition-all hover:bg-surface-tertiary active:scale-[0.98]"
                  >
                    {t("payments.removeAllocation")}
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <p className="text-xs uppercase tracking-wide text-brand-700">
            {t("payments.appliedTotal")}
          </p>
          <p className="mt-1 text-xl font-bold text-brand-800">{currency.format(total)}</p>
        </div>
      </div>

      <FormError message={state.error} />

      <div className="w-full sm:w-56">
        <SubmitButton
          label={t("payments.create")}
          pendingLabel={t("common.loading")}
          pending={pending}
        />
      </div>
    </form>
  );
}