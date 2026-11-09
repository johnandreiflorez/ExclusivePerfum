"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import { createInvoiceAction, type InvoiceActionState } from "@/lib/actions/invoices";
import {
  Field,
  TextInput,
  SelectInput,
  SubmitButton,
  FormError,
} from "@/components/ui/form";

const initialState: InvoiceActionState = {};

type SaleOption = {
  id: string;
  number: string;
  customerName: string;
  subtotal: string;
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

function defaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

export function InvoiceForm({ sales }: { sales: SaleOption[] }) {
  const t = useTranslation();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createInvoiceAction, initialState);

  const [saleId, setSaleId] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [shipping, setShipping] = useState("0");
  const [insurance, setInsurance] = useState("0");

  useEffect(() => {
    if (state.success) router.push("/facturas");
  }, [state.success, router]);

  const sale = sales.find((s) => s.id === saleId);
  const subtotal = sale ? toNumber(sale.subtotal) : 0;
  const total = subtotal - toNumber(discount) + toNumber(tax) + toNumber(shipping) + toNumber(insurance);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-gap">
      <div className="grid grid-cols-1 gap-gap sm:grid-cols-2">
        <Field label={t("invoices.sale")} required>
          <SelectInput
            name="saleId"
            required
            defaultValue=""
            value={saleId}
            onChange={(e) => setSaleId(e.target.value)}
          >
            <option value="" disabled>
              {t("invoices.selectSale")}
            </option>
            {sales.map((sale) => (
              <option key={sale.id} value={sale.id}>
                {sale.number} — {sale.customerName}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label={t("invoices.dueDate")} required>
          <TextInput
            name="dueDate"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>

        <Field label={t("invoices.discount")}>
          <TextInput
            name="discount"
            inputMode="decimal"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </Field>

        <Field label={t("invoices.tax")}>
          <TextInput
            name="tax"
            inputMode="decimal"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
          />
        </Field>

        <Field label={t("invoices.shipping")}>
          <TextInput
            name="shipping"
            inputMode="decimal"
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
          />
        </Field>

        <Field label={t("invoices.insurance")}>
          <TextInput
            name="insurance"
            inputMode="decimal"
            value={insurance}
            onChange={(e) => setInsurance(e.target.value)}
          />
        </Field>

        <Field label={t("invoices.installmentsCount")}>
          <TextInput name="installments" type="number" min="1" defaultValue="1" />
        </Field>

        <Field label={t("invoices.intervalDays")}>
          <TextInput name="intervalDays" type="number" min="1" defaultValue="30" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-gap sm:grid-cols-3">
        <div className="rounded-lg border border-border-default p-4">
          <p className="text-xs uppercase tracking-wide text-text-faint">
            {t("invoices.subtotal")}
          </p>
          <p className="mt-1 text-xl font-bold text-text-main">
            {currency.format(subtotal)}
          </p>
        </div>
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-brand-700">
            {t("invoices.total")}
          </p>
          <p className="mt-1 text-xl font-bold text-brand-800">
            {currency.format(total)}
          </p>
        </div>
      </div>

      <FormError message={state.error} />

      <div className="w-full sm:w-56">
        <SubmitButton
          label={t("invoices.create")}
          pendingLabel={t("common.loading")}
          pending={pending}
        />
      </div>
    </form>
  );
}