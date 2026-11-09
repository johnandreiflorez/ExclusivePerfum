"use client";

import { useActionState } from "react";
import { useTranslation } from "@/lib/i18n/provider";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { TextInput, SubmitButton } from "@/components/ui/form";

const initialState: LoginState = {};

export function LoginForm() {
  const t = useTranslation();
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-gap">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-text-main">
          {t("auth.email")}
        </label>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-text-main"
        >
          {t("auth.password")}
        </label>
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error ? (
        <p className="rounded-lg border border-status-danger/20 bg-status-danger/10 px-3 py-2.5 text-sm font-medium text-status-danger">
          {t(state.error)}
        </p>
      ) : null}

      <SubmitButton
        label={t("auth.login")}
        pendingLabel={t("common.loading")}
        pending={pending}
        className="mt-2"
      />
    </form>
  );
}