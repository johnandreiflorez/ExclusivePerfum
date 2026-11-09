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

export const invoiceSchema = z.object({
  saleId: z.string().min(1, "Selecciona una venta"),
  dueDate: z.string().min(1, "Fecha de vencimiento requerida").transform((v) => new Date(v)),
  discount: moneyString,
  tax: moneyString,
  shipping: moneyString,
  insurance: moneyString,
  installments: z.coerce.number().int().min(1, "Mínimo una cuota").default(1),
  intervalDays: z.coerce.number().int().min(1).default(30),
});

export type InvoiceCreateInput = z.infer<typeof invoiceSchema>;

export const paymentAllocationSchema = z.object({
  invoiceId: z.string().min(1, "Selecciona una factura"),
  amount: z.coerce.number().positive("El valor debe ser mayor a 0"),
});

export const paymentSchema = z.object({
  customerId: z.string().min(1, "Selecciona un cliente"),
  paymentDate: z
    .string()
    .min(1, "Fecha requerida")
    .transform((v) => new Date(v)),
  method: z.enum(["CASH", "TRANSFER", "DEPOSIT", "CARD", "PSE", "OTHER"]).default("OTHER"),
  reference: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  allocations: z.array(paymentAllocationSchema).min(1, "Aplica el pago a al menos una factura"),
});

export type PaymentCreateInput = z.infer<typeof paymentSchema>;

export const INVOICE_STATUSES = {
  PENDING: "PENDIENTE",
  PARTIAL: "ABONADA",
  PAID: "PAGADA",
  OVERDUE: "VENCIDA",
  ANNULLED: "ANULADA",
} as const;

export const INSTALLMENT_STATUSES = {
  PENDING: "PENDIENTE",
  PARTIAL: "PARCIAL",
  PAID: "PAGADA",
  OVERDUE: "VENCIDA",
} as const;

export const PAYMENT_METHODS = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  DEPOSIT: "Consignación",
  CARD: "Tarjeta",
  PSE: "PSE",
  OTHER: "Otro",
} as const;