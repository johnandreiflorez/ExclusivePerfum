import { es, type Messages } from "./es";

type DeepKeys<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}.${DeepKeys<T[K]>}`
    : `${K}`;
}[keyof T & (string | number)];

export type TranslationKey = DeepKeys<Messages>;

const dict: Messages = es;

export function getTranslation(key: string): string {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[part];
  }, dict);

  if (typeof value === "string") return value;

  return key;
}