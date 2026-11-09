"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import { createCustomerAction, type CustomerActionState } from "@/lib/actions/customers";
import {
  Field,
  TextInput,
  SelectInput,
  TextArea,
  SubmitButton,
  FormError,
} from "@/components/ui/form";

const initialState: CustomerActionState = {};

export function CustomerForm({ createUrl }: { createUrl: string }) {
  const t = useTranslation();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createCustomerAction, initialState);

  useEffect(() => {
    if (state.success) router.push("/clientes");
  }, [state.success, router]);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-gap">
      <div className="grid grid-cols-1 gap-gap sm:grid-cols-2">
        <Field label={t("customers.documentType")} required>
          <SelectInput name="documentType" defaultValue="CC">
            <option value="CC">{t("customers.cc")}</option>
            <option value="CE">{t("customers.ce")}</option>
            <option value="NIT">{t("customers.nit")}</option>
            <option value="PASSPORT">{t("customers.passport")}</option>
            <option value="OTHER">{t("customers.other")}</option>
          </SelectInput>
        </Field>

        <Field label={t("customers.documentNumber")} required>
          <TextInput name="documentNumber" required />
        </Field>

        <Field label={t("customers.name")} required>
          <TextInput name="name" required />
        </Field>

        <Field label={t("customers.phone")}>
          <TextInput name="phone" />
        </Field>

        <Field label={t("customers.email")}>
          <TextInput name="email" type="email" />
        </Field>

        <Field label={t("customers.address")}>
          <TextInput name="address" />
        </Field>

        <Field label={t("customers.city")}>
          <TextInput name="city" />
        </Field>

        <Field label={t("customers.department")}>
          <TextInput name="department" />
        </Field>
      </div>

      <Field label={t("customers.observations")}>
        <TextArea name="observations" rows={3} />
      </Field>

      <div className="w-full sm:w-48">
        <Field label={t("customers.status")}>
          <SelectInput name="status" defaultValue="ACTIVE">
            <option value="ACTIVE">{t("customers.active")}</option>
            <option value="INACTIVE">{t("customers.inactive")}</option>
            <option value="BLOCKED">{t("customers.blocked")}</option>
          </SelectInput>
        </Field>
      </div>

      <FormError message={state.error} />
      <input type="hidden" name="redirectTo" value={createUrl} />

      <div className="w-full sm:w-48">
        <SubmitButton
          label={t("common.save")}
          pendingLabel={t("common.loading")}
          pending={pending}
        />
      </div>
    </form>
  );
}