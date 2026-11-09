import Link from "next/link";
import { PlusIcon } from "@/components/ui/icons";

export function CreateLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-raised transition-all hover:bg-brand-700 active:scale-[0.98]"
    >
      <PlusIcon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function SecondaryLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-surface-primary px-4 py-2 text-sm font-medium text-text-subtle shadow-card transition-all hover:bg-surface-tertiary hover:text-text-main"
    >
      {label}
    </Link>
  );
}