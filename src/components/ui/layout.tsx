import { InboxIcon } from "@/components/ui/icons";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border-default bg-surface-primary p-6 shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {icon ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            {icon}
          </span>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 text-sm text-text-subtle">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface-primary px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-tertiary text-text-faint">
        <InboxIcon className="h-6 w-6" />
      </span>
      <p className="text-sm text-text-subtle">{message}</p>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "brand" | "danger" | "warning" | "success";
}) {
  const tones = {
    default: "text-text-main",
    brand: "text-brand-700",
    danger: "text-status-danger",
    warning: "text-status-warning",
    success: "text-status-success",
  } as const;

  return (
    <Card>
      <p className="text-sm text-text-subtle">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${tones[tone]}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-text-faint">{hint}</p> : null}
    </Card>
  );
}