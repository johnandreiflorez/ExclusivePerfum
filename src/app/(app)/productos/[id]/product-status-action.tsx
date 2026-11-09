"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import { updateProductStatusAction } from "@/lib/actions/products";

export function ProductStatusAction({
  productId,
  currentStatus,
}: {
  productId: string;
  currentStatus: "ACTIVE" | "INACTIVE";
}) {
  const t = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  function handleChange() {
    const form = new FormData();
    form.set("id", productId);
    form.set("status", nextStatus);
    startTransition(async () => {
      await updateProductStatusAction(form);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleChange}
      disabled={pending}
      className="rounded-lg border border-border-default bg-surface-primary px-4 py-2 text-sm font-medium text-text-subtle shadow-card transition-all hover:bg-surface-tertiary hover:text-text-main active:scale-[0.98] disabled:opacity-50"
    >
      {pending
        ? t("common.loading")
        : currentStatus === "ACTIVE"
          ? t("products.inactive")
          : t("products.active")}
    </button>
  );
}