import { useId } from "react";

export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const child = children as React.ReactElement<{ id?: string }>;
  const elementId = child?.props?.id ?? id;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={elementId}
        className="text-sm font-medium text-text-main"
      >
        {label}
        {required ? (
          <span className="text-status-danger"> *</span>
        ) : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-text-faint">{hint}</p> : null}
      {error ? (
        <p className="text-sm text-status-danger">{error}</p>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-main shadow-card outline-none transition-all placeholder:text-text-faint focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:opacity-60";

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function SelectInput(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <select {...props} className={`${inputClass} ${props.className ?? ""}`} />
  );
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`${inputClass} ${props.className ?? ""}`}
    />
  );
}

export function SubmitButton({
  label,
  pendingLabel,
  pending,
  className = "",
}: {
  label: string;
  pendingLabel: string;
  pending: boolean;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-raised transition-all hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none ${className}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-status-danger/20 bg-status-danger/10 px-3 py-2.5 text-sm font-medium text-status-danger">
      {message}
    </p>
  );
}