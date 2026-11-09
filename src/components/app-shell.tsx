"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n/provider";
import { logoutAction } from "@/lib/auth/actions";
import type { SessionUser } from "@/lib/auth/session";
import {
  AuditIcon,
  CustomersIcon,
  DashboardIcon,
  InvoiceIcon,
  InvestmentsIcon,
  InvestorIcon,
  InvestorPaymentsIcon,
  LogoutIcon,
  PaymentsIcon,
  PortfolioIcon,
  ProductsIcon,
  ProfitIcon,
  SalesIcon,
  SettingsIcon,
  ShipmentsIcon,
  UsersIcon,
} from "@/components/ui/icons";

type NavItem = {
  href: string;
  label:
    | "nav.dashboard"
    | "nav.customers"
    | "nav.products"
    | "nav.sales"
    | "nav.shipments"
    | "nav.invoices"
    | "nav.payments"
    | "nav.portfolio"
    | "nav.investors"
    | "nav.investments"
    | "nav.profits"
    | "nav.investorPayments"
    | "nav.audit"
    | "nav.users"
    | "nav.settings";
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
  permission?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "nav.dashboard", icon: DashboardIcon },
  { href: "/clientes", label: "nav.customers", icon: CustomersIcon },
  { href: "/productos", label: "nav.products", icon: ProductsIcon },
  { href: "/ventas", label: "nav.sales", icon: SalesIcon },
  { href: "/facturas", label: "nav.invoices", icon: InvoiceIcon, permission: "invoices.view" },
  { href: "/pagos", label: "nav.payments", icon: PaymentsIcon, permission: "payments.view" },
  { href: "/cartera", label: "nav.portfolio", icon: PortfolioIcon, permission: "portfolio.view" },
  { href: "/inversores", label: "nav.investors", icon: InvestorIcon, permission: "investors.view" },
  { href: "/inversiones", label: "nav.investments", icon: InvestmentsIcon, permission: "investments.view" },
  { href: "/ganancias", label: "nav.profits", icon: ProfitIcon, permission: "profits.view" },
  { href: "/pagos-inversores", label: "nav.investorPayments", icon: InvestorPaymentsIcon, permission: "profits.view" },
  { href: "/despachos", label: "nav.shipments", icon: ShipmentsIcon },
  { href: "/usuarios", label: "nav.users", icon: UsersIcon },
  { href: "/auditoria", label: "nav.audit", icon: AuditIcon },
  { href: "/ajustes", label: "nav.settings", icon: SettingsIcon },
];

function Brand() {
  const t = useTranslation();
  return (
    <Link href="/dashboard" className="flex items-center gap-3 px-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-black text-text-inverse shadow-raised">
        EP
      </span>
      <span className="text-base font-bold tracking-tight text-text-main">
        {t("common.appName")}
      </span>
    </Link>
  );
}

function NavList({
  permissions,
  onNavigate,
}: {
  permissions: string[];
  onNavigate?: () => void;
}) {
  const t = useTranslation();
  const pathname = usePathname();

  const visible = NAV_ITEMS.filter(
    (item) => !item.permission || permissions.includes(item.permission),
  );

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="flex flex-col gap-1">
        {visible.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-brand-50 font-semibold text-brand-700"
                    : "text-text-subtle hover:bg-surface-tertiary hover:text-text-main"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                    active
                      ? "text-brand-600"
                      : "text-text-faint group-hover:text-text-subtle"
                  }`}
                />
                <span>{t(item.label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function UserFooter({ user }: { user: SessionUser }) {
  const t = useTranslation();
  return (
    <div className="border-t border-border-default p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-sm font-semibold text-brand-700">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-main">
              {user.name}
            </p>
            <p className="truncate text-xs text-text-faint">{user.email}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            title={t("auth.logout")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-default text-text-subtle transition-colors hover:bg-surface-tertiary hover:text-status-danger"
          >
            <LogoutIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  permissions,
  children,
}: {
  user: SessionUser;
  permissions: string[];
  children: React.ReactNode;
}) {
  const t = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-secondary">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 shrink-0 flex-col border-r border-border-default bg-surface-primary md:flex">
        <div className="flex h-16 items-center border-b border-border-default px-4">
          <Brand />
        </div>
        <NavList permissions={permissions} />
        <UserFooter user={user} />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-surface-inverse/40 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface-primary shadow-drawer animate-slide-in">
            <div className="flex h-16 items-center justify-between border-b border-border-default px-4">
              <Brand />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t("common.close")}
                className="flex h-8 w-8 items-center justify-center rounded-md text-xl text-text-subtle hover:bg-surface-tertiary"
              >
                ×
              </button>
            </div>
            <NavList permissions={permissions} onNavigate={() => setDrawerOpen(false)} />
            <UserFooter user={user} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col md:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-default bg-surface-primary/80 px-4 backdrop-blur-md sm:px-6 md:hidden">
          <Brand
          />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("common.menu")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-default text-text-main"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>
        </header>
        <main className="flex-1 p-spacing-page">{children}</main>
      </div>
    </div>
  );
}