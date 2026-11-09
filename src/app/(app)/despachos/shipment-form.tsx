"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import { createShipmentAction, type ShipmentActionState } from "@/lib/actions/shipments";
import {
  Field,
  TextInput,
  SelectInput,
  TextArea,
  SubmitButton,
  FormError,
} from "@/components/ui/form";

const initialState: ShipmentActionState = {};

export function ShipmentForm({
  sales,
}: {
  sales: { id: string; number: string; customerName: string }[];
}) {
  const t = useTranslation();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createShipmentAction, initialState);

  useEffect(() => {
    if (state.success) router.push("/despachos");
  }, [state.success, router]);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-gap">
      <div className="grid grid-cols-1 gap-gap sm:grid-cols-2">
        <Field label={t("shipments.saleNumber")} required>
          <SelectInput name="saleId" required defaultValue="">
            <option value="" disabled>
              {t("shipments.selectSale")}
            </option>
            {sales.map((sale) => (
              <option key={sale.id} value={sale.id}>
                {sale.number} — {sale.customerName}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label={t("shipments.date")} required>
          <TextInput name="shipmentDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </Field>

        <Field label={t("shipments.carrier")} required>
          <TextInput name="carrier" required />
        </Field>

        <Field label={t("shipments.trackingNumber")}>
          <TextInput name="trackingNumber" />
        </Field>

        <Field label={t("shipments.shippingCost")}>
          <TextInput name="shippingCost" inputMode="decimal" defaultValue="0" />
        </Field>

        <Field label={t("shipments.insurance")}>
          <TextInput name="insurance" inputMode="decimal" defaultValue="0" />
        </Field>

        <Field label={t("shipments.estimatedDeliveryDate")}>
          <TextInput name="estimatedDeliveryDate" type="date" />
        </Field>

        <Field label={t("shipments.deliveredDate")}>
          <TextInput name="deliveredDate" type="date" />
        </Field>
      </div>

      <Field label={t("shipments.details")}>
        <TextArea name="details" rows={3} />
      </Field>

      <FormError message={state.error} />

      <div className="w-full sm:w-56">
        <SubmitButton
          label={t("common.save")}
          pendingLabel={t("common.loading")}
          pending={pending}
        />
      </div>
    </form>
  );
}