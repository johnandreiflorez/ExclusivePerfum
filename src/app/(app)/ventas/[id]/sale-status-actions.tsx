"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import { updateSaleStatusAction } from "@/lib/actions/sales";

type SaleStatusValue = "DRAFT" | "CONFIRMED" | "CANCELLED";

const initialState: { error?: string; success?: boolean } = {};

export function SaleStatusActions({
  saleId,
  status,
}: {
  saleId: string;
  status: SaleStatusValue;
}) {
  const t = useTranslation();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateSaleStatusAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  if (status === "CANCELLED") {
    return (
      <p className="text-sm text-status-danger">
        {t("sales.cancelled")}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <form action={formAction}>
        <input type="hidden" name="id" value={saleId} />
        <input type="hidden" name="status" value="CONFIRMED" />
        {status === "DRAFT" ? (
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-text-inverse shadow-raised transition-all hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? t("common.loading") : t("sales.confirmSale")}
          </button>
        ) : null}
      </form>
      <form action={formAction}>
        <input type="hidden" name="id" value={saleId} />
        <input type="hidden" name="status" value="CANCELLED" />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-status-danger/40 px-4 py-2 text-sm font-semibold text-status-danger transition-colors hover:bg-status-danger/5 disabled:opacity-50"
        >
          {pending ? t("common.loading") : t("sales.cancelSale")}
        </button>
      </form>
      {state.error ? (
        <p className="w-full text-sm text-status-danger">{state.error}</p>
      ) : null}
    </div>
  );
}