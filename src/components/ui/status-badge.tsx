const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  ACTIVE: { badge: "bg-status-success/10 text-status-success", dot: "bg-status-success" },
  INACTIVE: { badge: "bg-text-faint/10 text-text-subtle", dot: "bg-text-faint" },
  BLOCKED: { badge: "bg-status-danger/10 text-status-danger", dot: "bg-status-danger" },
  DRAFT: { badge: "bg-text-faint/10 text-text-subtle", dot: "bg-text-faint" },
  CONFIRMED: { badge: "bg-status-info/10 text-status-info", dot: "bg-status-info" },
  CANCELLED: { badge: "bg-status-danger/10 text-status-danger", dot: "bg-status-danger" },
  PENDING: { badge: "bg-status-warning/10 text-status-warning", dot: "bg-status-warning" },
  PREPARING: { badge: "bg-status-info/10 text-status-info", dot: "bg-status-info" },
  DISPATCHED: { badge: "bg-status-info/10 text-status-info", dot: "bg-status-info" },
  IN_TRANSIT: { badge: "bg-status-info/10 text-status-info", dot: "bg-status-info" },
  DELIVERED: { badge: "bg-status-success/10 text-status-success", dot: "bg-status-success" },
  RETURNED: { badge: "bg-status-danger/10 text-status-danger", dot: "bg-status-danger" },
  PARTIAL: { badge: "bg-status-info/10 text-status-info", dot: "bg-status-info" },
  PAID: { badge: "bg-status-success/10 text-status-success", dot: "bg-status-success" },
  OVERDUE: { badge: "bg-status-danger/10 text-status-danger", dot: "bg-status-danger" },
  ANNULLED: { badge: "bg-text-faint/10 text-text-subtle", dot: "bg-text-faint" },
  GENERADA: { badge: "bg-status-info/10 text-status-info", dot: "bg-status-info" },
  PENDIENTE_PAGO: { badge: "bg-status-warning/10 text-status-warning", dot: "bg-status-warning" },
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const style = STATUS_STYLES[status] ?? {
    badge: "bg-text-faint/10 text-text-subtle",
    dot: "bg-text-faint",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.badge}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}