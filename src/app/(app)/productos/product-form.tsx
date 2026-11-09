"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import { createProductAction, type ProductActionState } from "@/lib/actions/products";
import {
  Field,
  TextInput,
  SelectInput,
  TextArea,
  SubmitButton,
  FormError,
} from "@/components/ui/form";

const initialState: ProductActionState = {};

export function ProductForm({ categories }: { categories: { id: string; name: string }[] }) {
  const t = useTranslation();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createProductAction, initialState);

  useEffect(() => {
    if (state.success) router.push("/productos");
  }, [state.success, router]);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-gap">
      <div className="grid grid-cols-1 gap-gap sm:grid-cols-2">
        <Field label={t("products.sku")} required>
          <TextInput name="sku" required placeholder="PERF-001" />
        </Field>

        <Field label={t("products.name")} required>
          <TextInput name="name" required />
        </Field>

        <Field label={t("products.category")}>
          <SelectInput name="categoryId" defaultValue="">
            <option value="">{t("products.noCategory")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label={t("products.brand")}>
          <TextInput name="brand" />
        </Field>

        <Field label={t("products.unit")}>
          <SelectInput name="unit" defaultValue="UN">
            <option value="UN">{t("products.unit_UN")}</option>
            <option value="ML">{t("products.unit_ML")}</option>
            <option value="G">{t("products.unit_G")}</option>
            <option value="KG">{t("products.unit_KG")}</option>
            <option value="L">{t("products.unit_L")}</option>
          </SelectInput>
        </Field>

        <Field label={t("products.referenceCost")}>
          <TextInput name="referenceCost" inputMode="decimal" defaultValue="0" />
        </Field>

        <Field label={t("products.referencePrice")}>
          <TextInput name="referencePrice" inputMode="decimal" defaultValue="0" />
        </Field>

        <Field label={t("products.status")}>
          <SelectInput name="status" defaultValue="ACTIVE">
            <option value="ACTIVE">{t("products.active")}</option>
            <option value="INACTIVE">{t("products.inactive")}</option>
          </SelectInput>
        </Field>
      </div>

      <Field label={t("products.description")}>
        <TextArea name="description" rows={3} />
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