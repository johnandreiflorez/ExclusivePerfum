"use client";

import { createContext, useContext, useCallback, useMemo } from "react";
import type { TranslationKey } from "./index";
import { getTranslation } from "./index";

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

const I18nContext = createContext<TranslateFn>(() => "");

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const t = useCallback<TranslateFn>((key, params) => {
    const template = getTranslation(key);
    if (!params) return template;

    return Object.entries(params).reduce((acc, [name, value]) => {
      const placeholder = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, "g");
      return acc.replace(placeholder, String(value));
    }, template);
  }, []);

  const value = useMemo(() => t, [t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): TranslateFn {
  return useContext(I18nContext);
}