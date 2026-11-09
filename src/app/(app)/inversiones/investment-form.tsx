"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import { createInvestmentAction, type InvestorActionState } from "@/lib/actions/investors";
import {
  Field,
  TextInput,
  SelectInput,
  TextArea,
  SubmitButton,
  FormError,
} from "@/components/ui/form";

const initialState: InvestorActionState = {};

type InvestorOption = {
  id: string;
  name: string;
};

export function InvestmentForm({ investors }: { investors: InvestorOption[] }) {
  const t = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(createInvestmentAction, initialState);

  const [investorId, setInvestorId] = useState(
    searchParams.get("investorId") ?? "",
  );
  const [type, setType] = useState("APORTE");

  useEffect(() => {
    if (state.success) {
      router.push(investorId ? `/inversores/${investorId}` : "/inversiones");
    }
  }, [state.success, router, investorId]);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-gap">
      <div className="grid grid-cols-1 gap-gap sm:grid-cols-2">
        <Field label={t("investments.investor")} required>
          <SelectInput
            name="investorId"
            required
            value={investorId}
            onChange={(e) => setInvestorId(e.target.value)}
          >
            <option value="" disabled>
              {t("investments.investor")}
            </option>
            {investors.map((investor) => (
              <option key={investor.id} value={investor.id}>
                {investor.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label={t("investments.date")} required>
          <TextInput
            name="investmentDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </Field>

        <Field label={t("investments.type")} required>
          <SelectInput
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="APORTE">{t("investments.type_APORTE")}</option>
            <option value="RETIRO">{t("investments.type_RETIRO")}</option>
            <option value="DEVOLUCION">{t("investments.type_DEVOLUCION")}</option>
            <option value="AJUSTE">{t("investments.type_AJUSTE")}</option>
          </SelectInput>
        </Field>

        <Field label={t("investments.amount")} required>
          <TextInput name="amount" inputMode="decimal" required />
        </Field>

        <Field label={t("investments.reference")}>
          <TextInput name="reference" />
        </Field>
      </div>

      <Field label={t("investments.observations")}>
        <TextArea name="observations" rows={2} />
      </Field>

      {type === "AJUSTE" ? (
        <p className="rounded-lg border border-status-info/20 bg-status-info/10 px-3 py-2.5 text-sm font-medium text-status-info">
          {t("investments.ajusteHint")}
        </p>
      ) : null}

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