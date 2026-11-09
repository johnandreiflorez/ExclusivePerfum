"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import { createSaleAction, type SaleActionState } from "@/lib/actions/sales";
import {
  Field,
  TextInput,
  SelectInput,
  TextArea,
  SubmitButton,
  FormError,
} from "@/components/ui/form";
import { PlusIcon } from "@/components/ui/icons";

const initialState: SaleActionState = {};

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  referencePrice: string;
  referenceCost: string;
};

type ItemRow = {
  key: number;
  productId: string;
  quantity: string;
  unitCost: string;
  unitPrice: string;
  discount: string;
};

type CostRow = {
  key: number;
  type: string;
  description: string;
  amount: string;
};

type InvestorRow = {
  key: number;
  investorId: string;
  amount: string;
  percentage: string;
};

const COST_TYPES = [
  "PRODUCT",
  "SHIPPING",
  "INSURANCE",
  "COMMISSION",
  "PACKAGING",
  "TAX",
  "OTHER",
] as const;

function toNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function SaleForm({
  customers,
  products,
  investors,
}: {
  customers: { id: string; name: string }[];
  products: ProductOption[];
  investors: { id: string; name: string }[];
}) {
  const t = useTranslation();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createSaleAction, initialState);

  const [items, setItems] = useState<ItemRow[]>([]);
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [investorRows, setInvestorRows] = useState<InvestorRow[]>([]);
  const [keyCounter, setKeyCounter] = useState(1);

  useEffect(() => {
    if (state.success) router.push("/ventas");
  }, [state.success, router]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { key: keyCounter, productId: "", quantity: "1", unitCost: "0", unitPrice: "", discount: "0" },
    ]);
    setKeyCounter((k) => k + 1);
  }

  function removeItem(key: number) {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  function updateItem(key: number, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  function onProductChange(key: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateItem(key, {
      productId,
      unitPrice: product ? product.referencePrice : "",
      unitCost: product ? product.referenceCost : "0",
    });
  }

  function addCost() {
    setCosts((prev) => [
      ...prev,
      { key: keyCounter, type: "SHIPPING", description: "", amount: "" },
    ]);
    setKeyCounter((k) => k + 1);
  }

  function removeCost(key: number) {
    setCosts((prev) => prev.filter((cost) => cost.key !== key));
  }

  function updateCost(key: number, patch: Partial<CostRow>) {
    setCosts((prev) =>
      prev.map((cost) => (cost.key === key ? { ...cost, ...patch } : cost)),
    );
  }

  function addInvestor() {
    setInvestorRows((prev) => [
      ...prev,
      { key: keyCounter, investorId: "", amount: "", percentage: "" },
    ]);
    setKeyCounter((k) => k + 1);
  }

  function removeInvestor(key: number) {
    setInvestorRows((prev) =>
      prev.filter((investor) => investor.key !== key),
    );
  }

  function updateInvestor(key: number, patch: Partial<InvestorRow>) {
    setInvestorRows((prev) =>
      prev.map((investor) =>
        investor.key === key ? { ...investor, ...patch } : investor,
      ),
    );
  }

  const participationTotal = investorRows.reduce(
    (acc, row) => acc + toNumber(row.percentage),
    0,
  );
  const participationOk = Math.abs(participationTotal - 100) <= 0.01;

  const itemSubtotal = (item: ItemRow) =>
    toNumber(item.quantity) * toNumber(item.unitPrice) - toNumber(item.discount);

  const subtotal = items.reduce((acc, item) => acc + itemSubtotal(item), 0);
  const productCost = items.reduce(
    (acc, item) => acc + toNumber(item.quantity) * toNumber(item.unitCost),
    0,
  );
  const additionalCost = costs.reduce((acc, cost) => acc + toNumber(cost.amount), 0);
  const totalCost = productCost + additionalCost;
  const profit = subtotal - totalCost;
  const margin = subtotal > 0 ? (profit / subtotal) * 100 : 0;

  const currency = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  function serialize(source: unknown): string {
    return JSON.stringify(source);
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-gap">
      <div className="grid grid-cols-1 gap-gap sm:grid-cols-2">
        <Field label={t("sales.customer")} required>
          <SelectInput name="customerId" required defaultValue="">
            <option value="" disabled>
              {t("sales.customer")}
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label={t("sales.date")} required>
          <TextInput name="saleDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </Field>
      </div>

      <input
        type="hidden"
        name="items"
        value={serialize(
          items.map((item) => ({
            ...item,
            productId: item.productId || null,
            productName:
              products.find((p) => p.id === item.productId)?.name ?? "",
          })),
        )}
      />
      <input
        type="hidden"
        name="costs"
        value={serialize(
          costs.map((cost) => ({ ...cost })),
        )}
      />
      <input
        type="hidden"
        name="investors"
        value={serialize(
          investorRows.map((investor) => ({
            investorId: investor.investorId,
            amount: investor.amount,
            percentage: investor.percentage,
          })),
        )}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-main">{t("sales.items")}</h2>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-700 shadow-card transition-all hover:bg-brand-50 active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" />
            {t("sales.addItem")}
          </button>
        </div>

        {items.map((item) => (
          <div
            key={item.key}
            className="grid grid-cols-12 items-end gap-gap rounded-lg border border-border-default p-4"
          >
            <div className="col-span-12 sm:col-span-4">
              <Field label={t("sales.product")}>
                <SelectInput
                  value={item.productId}
                  onChange={(e) => onProductChange(item.key, e.target.value)}
                >
                  <option value="" disabled>
                    {t("sales.product")}
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <div className="col-span-3 sm:col-span-1">
              <Field label={t("sales.quantity")}>
                <TextInput
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                />
              </Field>
            </div>
            <div className="col-span-3 sm:col-span-2">
              <Field label={t("sales.unitCost")}>
                <TextInput
                  inputMode="decimal"
                  value={item.unitCost}
                  onChange={(e) => updateItem(item.key, { unitCost: e.target.value })}
                />
              </Field>
            </div>
            <div className="col-span-3 sm:col-span-2">
              <Field label={t("sales.unitPrice")}>
                <TextInput
                  inputMode="decimal"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(item.key, { unitPrice: e.target.value })}
                />
              </Field>
            </div>
            <div className="col-span-3 sm:col-span-2">
              <Field label={t("sales.discount")}>
                <TextInput
                  inputMode="decimal"
                  value={item.discount}
                  onChange={(e) => updateItem(item.key, { discount: e.target.value })}
                />
              </Field>
            </div>
            <div className="col-span-12 sm:col-span-1">
              <div className="flex items-end justify-between gap-2">
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="rounded-lg border border-border-default px-2 py-2 text-xs font-medium text-status-danger shadow-card transition-all hover:bg-surface-tertiary active:scale-[0.98]"
                >
                  {t("sales.removeItem")}
                </button>
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 ? (
          <p className="text-sm text-text-faint">{t("sales.addItem")}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-main">{t("sales.costs")}</h2>
          <button
            type="button"
            onClick={addCost}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-700 shadow-card transition-all hover:bg-brand-50 active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" />
            {t("sales.addCost")}
          </button>
        </div>

        {costs.map((cost) => (
          <div
            key={cost.key}
            className="grid grid-cols-12 items-end gap-gap rounded-lg border border-border-default p-4"
          >
            <div className="col-span-12 sm:col-span-3">
              <Field label={t("sales.costType")}>
                <SelectInput
                  value={cost.type}
                  onChange={(e) => updateCost(cost.key, { type: e.target.value })}
                >
                  {COST_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`sales.costType_${type}`)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <div className="col-span-8 sm:col-span-5">
              <Field label={t("sales.costDescription")}>
                <TextInput
                  value={cost.description}
                  onChange={(e) => updateCost(cost.key, { description: e.target.value })}
                />
              </Field>
            </div>
            <div className="col-span-4 sm:col-span-3">
              <Field label={t("sales.costAmount")}>
                <TextInput
                  inputMode="decimal"
                  value={cost.amount}
                  onChange={(e) => updateCost(cost.key, { amount: e.target.value })}
                />
              </Field>
            </div>
            <div className="col-span-12 sm:col-span-1">
              <button
                type="button"
                onClick={() => removeCost(cost.key)}
                className="rounded-lg border border-border-default px-2 py-2 text-xs font-medium text-status-danger shadow-card transition-all hover:bg-surface-tertiary active:scale-[0.98]"
              >
                {t("sales.removeItem")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-main">{t("sales.investors")}</h2>
          <button
            type="button"
            onClick={addInvestor}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-700 shadow-card transition-all hover:bg-brand-50 active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" />
            {t("sales.addInvestor")}
          </button>
        </div>

        {investorRows.map((investor) => (
          <div
            key={investor.key}
            className="grid grid-cols-12 items-end gap-gap rounded-lg border border-border-default p-4"
          >
            <div className="col-span-12 sm:col-span-5">
              <Field label={t("sales.investor")}>
                <SelectInput
                  value={investor.investorId}
                  onChange={(e) => updateInvestor(investor.key, { investorId: e.target.value })}
                >
                  <option value="" disabled>
                    {t("sales.investor")}
                  </option>
                  {investors.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Field label={t("sales.investorPercentage")}>
                <TextInput
                  inputMode="decimal"
                  value={investor.percentage}
                  onChange={(e) => updateInvestor(investor.key, { percentage: e.target.value })}
                />
              </Field>
            </div>
            <div className="col-span-5 sm:col-span-4">
              <Field label={t("sales.investorAmount")}>
                <TextInput
                  inputMode="decimal"
                  value={investor.amount}
                  onChange={(e) => updateInvestor(investor.key, { amount: e.target.value })}
                />
              </Field>
            </div>
            <div className="col-span-12 sm:col-span-1">
              <button
                type="button"
                onClick={() => removeInvestor(investor.key)}
                className="rounded-lg border border-border-default px-2 py-2 text-xs font-medium text-status-danger shadow-card transition-all hover:bg-surface-tertiary active:scale-[0.98]"
              >
                {t("sales.removeInvestor")}
              </button>
            </div>
          </div>
        ))}

        {investorRows.length > 0 ? (
          <div
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${
              participationOk
                ? "border-status-success/20 bg-status-success/10 text-status-success"
                : "border-status-danger/20 bg-status-danger/10 text-status-danger"
            }`}
          >
            <span>{t("sales.participationTotal")}</span>
            <span>
              {participationTotal.toFixed(2)}% —{" "}
              {participationOk
                ? t("sales.participationOk")
                : t("sales.participationWarning")}
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-gap sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border-default p-4">
          <p className="text-xs uppercase tracking-wide text-text-faint">{t("sales.subtotal")}</p>
          <p className="mt-1 text-xl font-bold text-text-main">{currency.format(subtotal)}</p>
        </div>
        <div className="rounded-lg border border-border-default p-4">
          <p className="text-xs uppercase tracking-wide text-text-faint">{t("sales.productCost")}</p>
          <p className="mt-1 text-xl font-bold text-text-main">{currency.format(productCost)}</p>
        </div>
        <div className="rounded-lg border border-border-default p-4">
          <p className="text-xs uppercase tracking-wide text-text-faint">{t("sales.additionalCosts")}</p>
          <p className="mt-1 text-xl font-bold text-text-main">{currency.format(additionalCost)}</p>
        </div>
        <div className="rounded-lg border border-border-default p-4">
          <p className="text-xs uppercase tracking-wide text-text-faint">{t("sales.totalCost")}</p>
          <p className="mt-1 text-xl font-bold text-text-main">{currency.format(totalCost)}</p>
        </div>
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-brand-700">{t("sales.profit")}</p>
          <p className="mt-1 text-xl font-bold text-brand-800">{currency.format(profit)}</p>
        </div>
        <div className="rounded-lg border border-border-default p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-text-faint">{t("sales.margin")}</p>
          <p className="mt-1 text-xl font-bold text-text-main">
            {margin.toFixed(2)}%
          </p>
        </div>
      </div>

      <Field label={t("sales.observations")}>
        <TextArea name="observations" rows={2} />
      </Field>

      <FormError message={state.error} />

      <div className="w-full sm:w-56">
        <SubmitButton
          label={t("sales.create")}
          pendingLabel={t("common.loading")}
          pending={pending}
        />
      </div>
    </form>
  );
}