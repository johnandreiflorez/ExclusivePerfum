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

export const customerSchema = z.object({
  documentType: z.enum(["CC", "CE", "NIT", "PASSPORT", "OTHER"]),
  documentNumber: z.string().min(3, "Número de documento muy corto"),
  name: z.string().min(2, "Nombre muy corto"),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email("Correo inválido")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v === "" || v == null ? null : v)),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).default("ACTIVE"),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const productSchema = z.object({
  sku: z.string().min(2, "SKU muy corto"),
  name: z.string().min(2, "Nombre muy corto"),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  unit: z.enum(["UN", "ML", "G", "KG", "L"]).default("UN"),
  referenceCost: moneyString,
  referencePrice: moneyString,
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type ProductInput = z.infer<typeof productSchema>;

export const saleItemSchema = z.object({
  productId: z.string().optional().nullable(),
  productName: z.string().min(1, "Selecciona un producto"),
  quantity: z.coerce.number().positive("Cantidad debe ser mayor a 0"),
  unitCost: z.coerce.number().min(0).default(0),
  unitPrice: z.coerce.number().positive("Precio unitario inválido"),
  discount: z.coerce.number().min(0).default(0),
});

export type SaleItemInput = z.infer<typeof saleItemSchema>;

export const saleCostSchema = z.object({
  type: z.enum(["PRODUCT", "SHIPPING", "INSURANCE", "COMMISSION", "PACKAGING", "TAX", "OTHER"]),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().min(0).default(0),
});

export type SaleCostInput = z.infer<typeof saleCostSchema>;

export const saleSchema = z.object({
  customerId: z.string().min(1, "Selecciona un cliente"),
  saleDate: z.string().min(1, "Fecha requerida").transform((v) => new Date(v)),
  observations: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, "Agrega al menos un producto"),
  costs: z.array(saleCostSchema).optional().default([]),
});

export type SaleCreateInput = z.infer<typeof saleSchema>;

export const shipmentSchema = z.object({
  saleId: z.string().min(1, "Selecciona una venta"),
  shipmentDate: z.string().min(1, "Fecha requerida").transform((v) => new Date(v)),
  carrier: z.string().min(2, "Transportadora requerida"),
  trackingNumber: z.string().optional().nullable(),
  shippingCost: z.coerce.number().min(0).default(0),
  insurance: z.coerce.number().min(0).default(0),
  estimatedDeliveryDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
  deliveredDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
  details: z.string().optional().nullable(),
  status: z
    .enum(["PENDING", "PREPARING", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "RETURNED"])
    .default("PENDING"),
});

export type ShipmentInput = z.infer<typeof shipmentSchema>;