"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import { createInvestorAction, type InvestorActionState } from "@/lib/actions/investors";
import {
  Field,
  TextInput,
  SelectInput,
  TextArea,
  SubmitButton,
  FormError,
} from "@/components/ui/form";

const initialState: InvestorActionState = {};

export function InvestorForm() {
  const t = useTranslation();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createInvestorAction, initialState);

  useEffect(() => {
    if (state.success) router.push("/inversores");
  }, [state.success, router]);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-gap">
      <div className="grid grid-cols-1 gap-gap sm:grid-cols-2">
        <Field label={t("investors.name")} required>
          <TextInput name="name" required />
        </Field>

        <Field label={t("investors.entryDate")} required>
          <TextInput
            name="entryDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </Field>

        <Field label={t("investors.documentType")}>
          <SelectInput name="documentType" defaultValue="">
            <option value="">—</option>
            <option value="CC">{t("customers.cc")}</option>
            <option value="CE">{t("customers.ce")}</option>
            <option value="NIT">{t("customers.nit")}</option>
            <option value="PASSPORT">{t("customers.passport")}</option>
            <option value="OTHER">{t("customers.other")}</option>
          </SelectInput>
        </Field>

        <Field label={t("investors.documentNumber")}>
          <TextInput name="documentNumber" />
        </Field>

        <Field label={t("investors.phone")}>
          <TextInput name="phone" />
        </Field>

        <Field label={t("investors.email")}>
          <TextInput name="email" type="email" />
        </Field>
      </div>

      <Field label={t("investors.observations")}>
        <TextArea name="observations" rows={3} />
      </Field>

      <div className="w-full sm:w-48">
        <Field label={t("investors.status")}>
          <SelectInput name="status" defaultValue="ACTIVE">
            <option value="ACTIVE">{t("investors.active")}</option>
            <option value="INACTIVE">{t("investors.inactive")}</option>
            <option value="BLOCKED">{t("investors.blocked")}</option>
          </SelectInput>
        </Field>
      </div>

      <FormError message={state.error} />

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