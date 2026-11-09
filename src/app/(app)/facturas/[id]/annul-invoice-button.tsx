"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import {
  annulInvoiceAction,
  type InvoiceActionState,
} from "@/lib/actions/invoices";

const initialState: InvoiceActionState = {};

export function AnnulInvoiceButton({
  invoiceId,
  disabled,
}: {
  invoiceId: string;
  disabled?: boolean;
}) {
  const t = useTranslation();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(annulInvoiceAction, initialState);

  useEffect(() => {
    if (state.success) router.push("/facturas");
  }, [state.success, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={invoiceId} />
      <button
        type="submit"
        disabled={pending || disabled}
        className="rounded-lg border border-status-danger/40 px-4 py-2 text-sm font-semibold text-status-danger transition-colors hover:bg-status-danger/5 disabled:opacity-50"
      >
        {pending ? t("common.loading") : t("invoices.annul")}
      </button>
    </form>
  );
}