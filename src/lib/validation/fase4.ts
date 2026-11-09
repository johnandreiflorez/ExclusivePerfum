import { z } from "zod";

export const moneyString = z
  .string()
  .optional()
  .transform((v) => {
    if (!v || v.trim() === "") return 0;
    const normalized = v.replace(/[$\s]/g, "").replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  });

export const investorSchema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  documentType: z.enum(["CC", "CE", "NIT", "PASSPORT", "OTHER"]).optional().nullable(),
  documentNumber: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email("Correo inválido")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v === "" || v == null ? null : v)),
  entryDate: z
    .string()
    .min(1, "Fecha requerida")
    .transform((v) => new Date(v)),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).default("ACTIVE"),
  observations: z.string().optional().nullable(),
});

export type InvestorInput = z.infer<typeof investorSchema>;

export const investmentSchema = z.object({
  investorId: z.string().min(1, "Selecciona un inversor"),
  investmentDate: z.string().min(1, "Fecha requerida").transform((v) => new Date(v)),
  type: z.enum(["APORTE", "RETIRO", "DEVOLUCION", "AJUSTE"]).default("APORTE"),
  amount: z.coerce.number().default(0),
  reference: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
});

export type InvestmentInput = z.infer<typeof investmentSchema>;

export const saleInvestorSchema = z
  .object({
    investorId: z.string().min(1, "Selecciona un inversor"),
    amount: z.coerce.number().min(0, "El monto no puede ser negativo").default(0),
    percentage: z.coerce.number().min(0, "El porcentaje no puede ser negativo").default(0),
  })
  .superRefine((investor, ctx) => {
    if (investor.percentage === 0 && investor.amount > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["percentage"],
        message: "Registra el porcentaje de participación",
      });
    }
  });

export type SaleInvestorInput = z.infer<typeof saleInvestorSchema>;

export const saleInvestorsSchema = z
  .array(saleInvestorSchema)
  .superRefine((investors, ctx) => {
    if (investors.length === 0) return;
    const seen: Record<string, boolean> = {};
    for (const investor of investors) {
      if (seen[investor.investorId]) {
        ctx.addIssue({
          code: "custom",
          message: "Un inversor no puede repetirse en la misma venta",
        });
        return;
      }
      seen[investor.investorId] = true;
    }
    const total = investors.reduce((acc, i) => acc + i.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      ctx.addIssue({
        code: "custom",
        message: `La suma de participaciones debe ser 100% (actual: ${total.toFixed(2)}%)`,
      });
    }
  });

export type SaleInvestorsInput = z.infer<typeof saleInvestorsSchema>;

export const investorPaymentAllocationSchema = z.object({
  profitDistributionId: z.string().min(1, "Selecciona una ganancia"),
  amount: z.coerce.number().positive("El valor debe ser mayor a 0"),
});

export const investorPaymentSchema = z.object({
  investorId: z.string().min(1, "Selecciona un inversor"),
  paymentDate: z.string().min(1, "Fecha requerida").transform((v) => new Date(v)),
  method: z
    .enum(["CASH", "TRANSFER", "DEPOSIT", "CARD", "OTHER"])
    .default("OTHER"),
  reference: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  allocations: z
    .array(investorPaymentAllocationSchema)
    .min(1, "Aplica el pago a al menos una ganancia"),
});

export type InvestorPaymentCreateInput = z.infer<typeof investorPaymentSchema>;

export const PROFIT_DISTRIBUTION_STATUSES = {
  GENERADA: "GENERADA",
  PENDIENTE_PAGO: "PENDIENTE_PAGO",
  PAGADA: "PAGADA",
  ANULADA: "ANULADA",
} as const;

export const INVESTOR_PAYMENT_METHODS = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  DEPOSIT: "Consignación",
  CARD: "Tarjeta",
  OTHER: "Otro",
} as const;

export const INVESTMENT_TYPES = {
  APORTE: "Aporte",
  RETIRO: "Retiro",
  DEVOLUCION: "Devolución",
  AJUSTE: "Ajuste",
} as const;