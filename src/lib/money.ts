export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[$.,\s]/g, ".").replace(/\.$/, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value !== null && typeof value === "object" && "toNumber" in value) {
    const n = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function formatCurrency(
  value: number | string | { toString: () => string } | null | undefined,
): string {
  const num = typeof value === "number" ? value : toNumber(value);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

export function parseDecimalInput(input: string | null | undefined): number {
  if (!input) return 0;
  const normalized = input.replace(/[,$]/g, ".");
  const parsed = parseFloat(normalized.replace(/\.(?=.*\.)/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}