"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n";
import { updateShipmentStatusAction } from "@/lib/actions/shipments";

type ShipmentStatusValue =
  | "PENDING"
  | "PREPARING"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RETURNED";

const FLOW: ShipmentStatusValue[] = [
  "PENDING",
  "PREPARING",
  "DISPATCHED",
  "IN_TRANSIT",
  "DELIVERED",
];

const STATUS_KEYS: Record<ShipmentStatusValue, TranslationKey> = {
  PENDING: "shipments.pending",
  PREPARING: "shipments.preparing",
  DISPATCHED: "shipments.dispatched",
  IN_TRANSIT: "shipments.in_transit",
  DELIVERED: "shipments.delivered",
  RETURNED: "shipments.returned",
};

export function ShipmentStatusActions({
  shipmentId,
  currentStatus,
}: {
  shipmentId: string;
  currentStatus: ShipmentStatusValue;
}) {
  const t = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(next: ShipmentStatusValue) {
    const form = new FormData();
    form.set("id", shipmentId);
    form.set("status", next);
    startTransition(async () => {
      await updateShipmentStatusAction(form);
      router.refresh();
    });
  }

  const nextIndex = FLOW.indexOf(currentStatus) + 1;
  const nextStatus = FLOW[nextIndex];

  return (
    <div className="flex flex-wrap gap-2">
      {pending ? (
        <span className="text-sm text-text-faint">{t("common.loading")}</span>
      ) : null}
      {currentStatus === "RETURNED" ? null : (
        <>
          {nextStatus ? (
            <button
              type="button"
              onClick={() => run(nextStatus)}
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-text-inverse shadow-raised transition-all hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
            >
              {t(STATUS_KEYS[nextStatus])}
            </button>
          ) : (
            <span className="rounded-lg bg-status-success/10 px-3 py-2 text-sm font-medium text-status-success">
              {t("shipments.delivered")}
            </span>
          )}
          <button
            type="button"
            onClick={() => run("RETURNED")}
            disabled={pending}
            className="rounded-lg border border-status-danger/40 px-4 py-2 text-sm font-semibold text-status-danger transition-colors hover:bg-status-danger/5 disabled:opacity-50"
          >
            {t("shipments.returned")}
          </button>
        </>
      )}
    </div>
  );
}