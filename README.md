# Exclusive Perfum

Sistema de Control de Ventas, Facturación, Cartera e Inversiones.

Desarrollado según `requerimientos del sistema.txt` con Next.js 16 + PostgreSQL + Prisma 7.

## Stack

- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Backend:** Next.js Server Actions / Server Components
- **Base de datos:** PostgreSQL 16 (Docker)
- **ORM:** Prisma 7 (Rust-free client + driver adapter `@prisma/adapter-pg`)
- **Estilos:** Tailwind CSS 4 con design tokens
- **Estado servidor (client):** TanStack Query (preparado)

## Requisitos previos

- Node.js 20.9+ (probado con 24)
- Docker + Docker Compose

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Crear variables de entorno
copy .env.example .env

# 3. Levantar PostgreSQL
npm run db:up

# 4. Aplicar migraciones
npm run db:deploy

# 5. Cargar datos iniciales (roles, permisos y usuario admin)
npm run db:seed

# 6. Desarrollar
npm run dev
```

Abrir http://localhost:3000

### Credenciales iniciales

| Campo     | Valor                       |
| --------- | --------------------------- |
| Correo    | admin@exclusiveperfum.com   |
| Contraseña| Admin123!                   |

> Cambia `ADMIN_EMAIL` / `ADMIN_PASSWORD` en `.env` antes del seed en producción.

## Scripts

| Comando             | Descripción                                   |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo (Turbopack)            |
| `npm run build`     | Build de producción                           |
| `npm run start`     | Servidor de producción                        |
| `npm run lint`      | ESLint                                        |
| `npm run typecheck` | TypeScript `tsc --noEmit`                     |
| `npm run db:up`     | Levantar PostgreSQL (Docker)                  |
| `npm run db:down`   | Detener PostgreSQL                            |
| `npm run db:migrate`| Crear/aplicar migración (`prisma migrate dev`)|
| `npm run db:deploy` | Aplicar migraciones pendientes                |
| `npm run db:seed`   | Cargar datos iniciales                        |
| `npm run db:studio` | Abrir Prisma Studio                           |

## Estructura

### FASE 1 — Fundaciones

| Ruta           | Descripción                                        |
| -------------- | -------------------------------------------------- |
| `/login`       | Autenticación (email + contraseña)                 |
| `/dashboard`   | Panel con métricas base                            |
| `/usuarios`    | Listado de usuarios y roles (solo ADMIN)           |
| `/auditoria`   | Historial de operaciones críticas                  |
| `/ajustes`     | Configuración (placeholder)                        |

### FASE 2 — Operación comercial

| Ruta                | Descripción                                          |
| ------------------- | ---------------------------------------------------- |
| `/clientes`         | Listado de clientes                                  |
| `/clientes/nuevo`   | Registrar cliente (CC/CE/NIT, estado)                |
| `/clientes/[id]`    | Detalle del cliente con historial de ventas          |
| `/productos`        | Listado de productos                                 |
| `/productos/nuevo`  | Registrar producto (SKU, costo/precio referencia)    |
| `/productos/[id]`   | Detalle del producto                                 |
| `/ventas`           | Listado de ventas                                    |
| `/ventas/nueva`     | Crear venta con ítems y costos asociados             |
| `/ventas/[id]`      | Detalle de venta (verificación, cancelación)         |
| `/despachos`        | Listado de despachos                                 |
| `/despachos/nuevo`  | Registrar despacho de una venta                      |
| `/despachos/[id]`   | Detalle del despacho (avance de estado)              |

### FASE 2 — Reglas de negocio

- Numeración de ventas secuencial por año: `V-AAAA-NNNNNN` vía `SaleCounter`.
- Subtotal = Σ(qty × precio − descuento); costo total = Σ(qty × costo) + costos adicionales; utilidad = subtotal − costo; margen = utilidad / subtotal.
- Estados: venta (`BORRADOR`, `CONFIRMADA`, `CANCELADA`) y despacho (`PENDIENTE`, `PREPARANDO`, `DESPACHADO`, `EN_TRANSITO`, `ENTREGADO`, `DEVUELTO`).
- Persistencia monetaria como `DECIMAL(18,2)`; entrada acepta formato COP (`$1.200.000`).

### FASE 3 — Facturación y cartera

| Ruta            | Descripción                                             |
| --------------- | ------------------------------------------------------- |
| `/facturas`     | Listado de facturas con estado efectivo                 |
| `/facturas/nueva`| Crear factura de una venta (con plan de cuotas)        |
| `/facturas/[id]`| Detalle: totales, cuotas, pagos aplicados, anulación    |
| `/pagos`        | Listado de pagos                                        |
| `/pagos/nuevo`  | Registrar pago y aplicarlo a una o varias facturas      |
| `/pagos/[id]`   | Detalle del pago con sus aplicaciones                   |
| `/cartera`      | Resumen, antigüedad de cartera y filtros por estado/cliente |

### FASE 3 — Reglas de negocio

- Numeración: facturas `FAC-AAAA-NNNNNN`, pagos `PAG-AAAA-NNNNNN` vía contadores anuales.
- Total factura = subtotal − descuento + impuestos + envío + seguro (`src/lib/billing/invoice-calculations.ts`).
- Una sola factura activa por venta; anulación solo con saldo en cero (`ANNULLED`; no hay borrado físico).
- Estados efectivos calculados en lectura: `PENDIENTE`, `ABONADA`, `PAGADA`, `VENCIDA`, `ANULADA`; la vencida depende del `dueDate` (`src/lib/billing/status.ts`).
- Plan de cuotas: montos iguales, la última absorbe el redondeo; la suma de cuotas siempre equivale al total (RN-005).
- Aplicación de pagos FIFO sobre cuotas (por número); no se permiten sobrepagos ni pagos a facturas de otro cliente.
- Cartera: antigüedad por rangos 0-30 / 31-60 / 61-90 / 91-120 / 120+ días (`src/lib/billing/portfolio.ts`).

### FASE 4 — Inversiones

| Ruta                     | Descripción                                              |
| ------------------------ | -------------------------------------------------------- |
| `/inversores`            | Listado de inversores con saldo de capital                |
| `/inversores/nuevo`      | Registrar inversor (CC/CE/NIT, estado)                    |
| `/inversores/[id]`       | Detalle: capital, utilización, ganancias y movimientos    |
| `/inversiones`           | Listado de inversiones con agregados                      |
| `/inversiones/nueva`     | Registrar aporte/retiro/devolución/ajuste                 |
| `/ganancias`             | Ganancias reconocidas por venta/factura (filtro inversor) |
| `/pagos-inversores`      | Listado de pagos de utilidades a inversores               |
| `/pagos-inversores/nuevo`| Pagar ganancias disponibles a un inversor (RN-007)        |
| `/pagos-inversores/[id]` | Detalle del pago con sus asignaciones                     |

### FASE 4 — Reglas de negocio

- Permisos: `investors.manage` / `investors.view`, `investments.manage` / `investments.view`, `profits.manage` / `profits.view`.
- Inversiones: aporte, retiro, devolución y ajuste (el ajuste admite valores negativos; los demás no). Saldo = aportes − retiros − devoluciones ± ajustes (`src/lib/investor/calculations.ts`).
- Participación por venta: % de reparto de utilidad, la suma debe ser 100 % (±0.01) y sin inversores repetidos (RN-006). La participación es opcional al crear la venta.
- Reconocimiento de ganancia al cobrar (PF-003): al registrar un pago de factura se genera/actualiza la distribución por inversor con `reconocido = utilidad × % × fracción cobrada` de la factura (`ProfitDistribution`, uno por venta-factura).
- Estados de ganancia: `GENERADA`, `PENDIENTE_PAGO` (reconocida ≥ esperada con saldo por pagar), `PAGADA` (saldada) y `ANULADA` (al cancelar la venta; no se anulan las ya pagadas).
- Pago de utilidades (RN-007): se aplica a distribuciones disponibles (nunca más del disponible ni distribuciones anuladas); numeración `IP-AAAA-NNNNNN`; auditoría `INVESTOR_PAYMENT`.

## Arquitectura

- Sesiones con cookie `HttpOnly` (`exclusive_session`) respaldadas en tabla `Session`.
- Contraseñas con hash `bcrypt` (12 rondas), nunca en texto plano ni localStorage.
- Auditoría de operaciones críticas en `AuditLog` (`CREATE`, `UPDATE`, `LOGIN`, etc.).
- RBAC: usuarios → roles → permisos.
- Server State en cliente vía TanStack Query (regla del proyecto); Server Actions para mutaciones.
- Todo el texto visible pasa por `useTranslation()` (diccionario `src/lib/i18n/es.ts`).
- Sin valores hardcodeados: clases Tailwind consumen design tokens (`@theme` en `globals.css`).
- Validación de formularios con `zod` en `src/lib/validation/`; sin `as`, usando type guards sobre arrays constantes de enum.

## Fases pendientes

Las fases 5–7 (gastos, cuentas, reportes, PWA/Capacitor) se desarrollan iterativamente sobre este cimiento.

## Pruebas end-to-end

Los scripts de regresión requieren el dev server corriendo (`npm run dev`) y la base de datos levantada. Borran los datos transaccionales antes de ejecutarse.

```bash
npx tsx scripts/e2e-fase2.mts   # Operación comercial (FASE 2)
npx tsx scripts/e2e-fase3.mts   # Facturación y cartera (FASE 3)
npx tsx scripts/e2e-fase4.mts   # Inversiones y ganancias (FASE 4)
```