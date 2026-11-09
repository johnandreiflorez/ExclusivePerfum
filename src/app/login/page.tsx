import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getTranslation } from "@/lib/i18n";
import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const t = getTranslation;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-secondary px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border-default bg-surface-primary shadow-raised lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 p-10 lg:flex">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            aria-hidden="true"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, #ffffff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <p className="relative text-sm font-semibold uppercase tracking-widest text-brand-200">
            Exclusive Perfum
          </p>
          <div className="relative">
            <h2 className="text-3xl font-bold leading-tight text-text-inverse">
              Ventas, facturación,
              <br />
              cartera e inversiones.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-brand-100/90">
              El sistema integral para administrar tu operación comercial y
              financiera en un solo lugar.
            </p>
          </div>
          <p className="relative text-xs text-brand-200/70">
            © {new Date().getFullYear()} Exclusive Perfum
          </p>
        </div>

        <div className="flex flex-col justify-center p-8 sm:p-12">
          <div className="lg:hidden mb-6 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-black text-text-inverse">
              EP
            </span>
            <span className="text-lg font-bold tracking-tight text-text-main">
              Exclusive Perfum
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-text-main">
            {t("auth.welcome")}
          </h1>
          <p className="mt-1 text-sm text-text-subtle">
            Sistema de control de ventas, facturación, cartera e inversiones
          </p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}