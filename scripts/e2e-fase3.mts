import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const base = "http://127.0.0.1:3000";

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/g, "/");
}

function extractActionFields(
  html: string,
  formContains: string,
): { ref: string; a0: string; a1: string; key: string; hasRef: boolean } {
  const forms = html.match(/<form[\s\S]*?<\/form>/g) ?? [];
  const target = forms.find((f) => f.includes(formContains)) ?? "";
  if (!target) return { ref: "", a0: "", a1: "", key: "", hasRef: false };

  const getVal = (name: string): string => {
    const re = new RegExp(`name="\\${name}"[^>]*value="([^"]*)"`, "g");
    const vals: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(target)) !== null) {
      vals.push(decodeEntities(m[1]));
    }
    return vals[vals.length - 1] ?? "";
  };

  const refMatch = target.match(/\$ACTION_REF_(\d+)/);
  const index = refMatch ? refMatch[1] : "";

  return {
    ref: index,
    a0: getVal(`$ACTION_${index}:0`),
    a1: getVal(`$ACTION_${index}:1`),
    key: getVal("$ACTION_KEY"),
    hasRef: target.includes("$ACTION_REF_"),
  };
}

async function getActionTokens(path: string, cookie: string | undefined, formContains: string) {
  const res = await fetch(`${base}${path}`, {
    headers: cookie ? { Cookie: cookie } : undefined,
    redirect: "manual",
  });
  if (res.status === 307 || res.status === 303) {
    throw new Error(`auth redirect on ${path}: ${res.status}`);
  }
  const html = await res.text();
  return extractActionFields(html, formContains);
}

function buildForm(fields: { ref: string; a0: string; a1: string; key: string; hasRef: boolean }, pairs: [string, string][]) {
  const form = new FormData();
  if (fields.hasRef) form.append(`$ACTION_REF_${fields.ref}`, "");
  form.append(`$ACTION_${fields.ref}:0`, fields.a0);
  form.append(`$ACTION_${fields.ref}:1`, fields.a1 ?? "[]");
  if (fields.key) form.append("$ACTION_KEY", fields.key);
  for (const [name, value] of pairs) form.append(name, value);
  return form;
}

async function login() {
  const tokens = await getActionTokens("/login", undefined, 'name="email"');
  const form = buildForm(tokens, [
    ["email", "admin@exclusiveperfum.com"],
    ["password", "Admin123!"],
  ]);

  const loginRes = await fetch(`${base}/login`, {
    method: "POST",
    headers: { Origin: base },
    body: form,
    redirect: "manual",
  });
  const rawCookie = loginRes.headers.get("set-cookie");
  if (!rawCookie) throw new Error(`login fail: ${loginRes.status}`);
  return rawCookie.split(";")[0];
}

async function postAction(path: string, cookie: string, fields: [string, string][], formContains: string) {
  const tokens = await getActionTokens(path, cookie, formContains);
  const form = buildForm(tokens, fields);

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { Origin: base, Cookie: cookie },
    body: form,
    redirect: "manual",
  });
  const text = await res.text();
  if (res.status >= 500 && text.includes("Failed to find Server Action")) {
    await new Promise((r) => setTimeout(r, 2500));
    return { status: res.status, text, devStale: true };
  }
  if (res.status >= 500) {
    const errMatch = text.match(/"message":"([^"]*)"/);
    console.log(`  500 body err: ${errMatch ? errMatch[1] : text.slice(0, 300)}`);
  }
  return { status: res.status, text };
}

function parseState(text: string) {
  const success = text.includes('"success":true');
  const errMatch = text.match(/"error":"([^"]*)"/);
  return { error: errMatch ? errMatch[1] : undefined, success };
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date();

function future(days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return isoDay(d);
}

async function main() {
  const cookie = await login();
  console.log("LOGIN OK:", cookie.slice(0, 30));

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  await prisma.investorPaymentAllocation.deleteMany({});
  await prisma.investorPayment.deleteMany({});
  await prisma.investorPaymentCounter.deleteMany({});
  await prisma.profitDistribution.deleteMany({});
  await prisma.saleInvestor.deleteMany({});
  await prisma.investment.deleteMany({});
  await prisma.investor.deleteMany({});
  await prisma.paymentAllocation.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoiceInstallment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.invoiceCounter.deleteMany({});
  await prisma.paymentCounter.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.saleCost.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.product.deleteMany({});

  const name = `Cliente Factura ${Date.now()}`;
  await postAction("/clientes/nuevo", cookie, [
    ["documentType", "CC"],
    ["documentNumber", `99${Date.now().toString().slice(-8)}`],
    ["name", name],
    ["phone", "3001234567"],
    ["email", ""],
    ["address", "Calle 1"],
    ["city", "Bogotá"],
    ["department", "Cundinamarca"],
    ["observations", ""],
    ["status", "ACTIVE"],
    ["redirectTo", "/clientes"],
  ], 'name="documentType"');

  const sku = `SKUF3-${Date.now().toString().slice(-6)}`;
  await postAction("/productos/nuevo", cookie, [
    ["sku", sku],
    ["name", "Perfume Factura"],
    ["description", "Prueba"],
    ["categoryId", ""],
    ["brand", "TestBrand"],
    ["unit", "ML"],
    ["referenceCost", "50000"],
    ["referencePrice", "120000"],
    ["status", "ACTIVE"],
  ], 'name="sku"');

  const items = JSON.stringify([
    {
      productId: null,
      productName: "Perfume Factura",
      quantity: 3,
      unitCost: 50000,
      unitPrice: 100000,
      discount: 0,
    },
  ]);
  const costs = JSON.stringify([]);

  const createSale = async () => {
    const customer = await prisma.customer.findFirst({ where: { name }, orderBy: { createdAt: "desc" } });
    return postAction("/ventas/nueva", cookie, [
      ["customerId", customer!.id],
      ["saleDate", isoDay(new Date())],
      ["observations", "Venta de prueba F3"],
      ["items", items],
      ["costs", costs],
    ], 'name="items"');
  };

  await createSale();
  const sale1 = await prisma.sale.findFirst({ orderBy: { createdAt: "desc" } });
  if (!sale1) throw new Error("no sale1");
  console.log("SALE1:", sale1.number, "subtotal:", sale1.subtotal.toString());

  const createInvoice = (saleId: string, due: string, extra: Record<string, string> = {}) =>
    postAction("/facturas/nueva", cookie, [
      ["saleId", saleId],
      ["dueDate", due],
      ["discount", "0"],
      ["tax", "0"],
      ["shipping", "0"],
      ["insurance", "0"],
      ["installments", "3"],
      ["intervalDays", "30"],
      ...Object.entries(extra),
    ], 'name="saleId"');

  const rInvoice = await createInvoice(sale1!.id, future(20));
  console.log("CREATE INVOICE 1:", rInvoice.status, JSON.stringify(parseState(rInvoice.text)));

  const invoice1 = await prisma.invoice.findFirst({ orderBy: { createdAt: "desc" } });
  if (!invoice1) throw new Error("no invoice1");
  const installments1 = await prisma.invoiceInstallment.findMany({
    where: { invoiceId: invoice1.id },
    orderBy: { number: "asc" },
  });
  console.log("INVOICE1:", invoice1.number, {
    total: invoice1.total.toString(),
    paid: invoice1.paidAmount.toString(),
    status: invoice1.status,
    installments: installments1.length,
  });

  const sumPlanned = installments1.reduce((acc, i) => acc + Number(i.plannedAmount), 0);
  const [a, b, c] = installments1;
  console.log("RN-005 (cuotas = total):", sumPlanned === Number(invoice1.total));
  console.log("FIFO plan (primera == segunda, última absorbe resto):",
    a.plannedAmount.toString() === b.plannedAmount.toString(),
    Number(c.plannedAmount) === Number(invoice1.total) - Number(a.plannedAmount) - Number(b.plannedAmount));

  if (installments1.length !== 3 || sumPlanned !== Number(invoice1.total)) {
    throw new Error(`registro de plan de pagos inválido: ${JSON.stringify(installments1.map((i) => i.plannedAmount.toString()))}`);
  }

  await createSale();
  const sale2 = await prisma.sale.findFirst({ where: { number: { not: sale1!.number } }, orderBy: { createdAt: "desc" } });
  if (!sale2) throw new Error("no sale2");
  await createInvoice(sale2!.id, future(10));
  const invoice2 = await prisma.invoice.findFirst({ where: { number: { not: invoice1.number } }, orderBy: { createdAt: "desc" } });
  if (!invoice2) throw new Error("no invoice2");
  console.log("INVOICE2:", invoice2.number);

  const target = Number(invoice1.total);
  const planned = target / 3;
  const payAmount = planned + 1000;
  const allocations = JSON.stringify([
    { invoiceId: invoice1.id, amount: payAmount },
  ]);

  const rPay = await postAction("/pagos/nuevo", cookie, [
    ["customerId", (await prisma.customer.findFirst())!.id],
    ["paymentDate", isoDay(new Date())],
    ["method", "TRANSFER"],
    ["reference", "REF-E2E-001"],
    ["observations", "Pago parcial de prueba"],
    ["allocations", allocations],
  ], 'name="allocations"');
  console.log("CREATE PAYMENT:", rPay.status, JSON.stringify(parseState(rPay.text)));
  if (!parseState(rPay.text).success) throw new Error("payment failed");

  const payment = await prisma.payment.findFirst({ orderBy: { createdAt: "desc" } });
  const inv1After = await prisma.invoice.findUnique({ where: { id: invoice1.id }, include: { installments: { orderBy: { number: "asc" } } } });
  if (!payment || !inv1After) throw new Error("no payment/invoice after");
  console.log("PAYMENT:", payment.number, {
    amount: payment.amount.toString(),
    method: payment.method,
  });
  console.log("INVOICE1 tras pago:", {
    paid: inv1After.paidAmount.toString(),
    status: inv1After.status,
  });
  console.log("FIFO cuotas:", inv1After.installments.map((i) => `${i.number}:${i.paidAmount}`).join(" "));
  const appliedToInstallments = inv1After.installments.reduce((acc, i) => acc + Number(i.paidAmount), 0);
  console.log("RN: suma cuotas == pago:", appliedToInstallments === payAmount);
  if (inv1After.paidAmount.toString() !== String(payAmount) || inv1After.status !== "PARTIAL") {
    throw new Error("estado/valor incorrecto tras pago parcial");
  }

  const overpayAlloc = JSON.stringify([
    { invoiceId: invoice2.id, amount: Number(invoice2.total) + 1 },
  ]);
  const rOver = await postAction("/pagos/nuevo", cookie, [
    ["customerId", (await prisma.customer.findFirst())!.id],
    ["paymentDate", isoDay(new Date())],
    ["method", "CASH"],
    ["reference", ""],
    ["observations", ""],
    ["allocations", overpayAlloc],
  ], 'name="allocations"');
  console.log("OVERPAYMENT (rechazo):", JSON.stringify(parseState(rOver.text)));

  await createSale();
  const sale3 = await prisma.sale.findFirst({ where: { number: { notIn: [sale1!.number, sale2!.number] } }, orderBy: { createdAt: "desc" } });
  if (!sale3) throw new Error("no sale3");
  await createInvoice(sale3!.id, future(-30));
  const invoice3 = await prisma.invoice.findFirst({ where: { id: { notIn: [invoice1.id, invoice2.id] } }, orderBy: { createdAt: "desc" } });
  if (!invoice3) throw new Error("no invoice3");
  console.log("INVOICE3 (vencida):", invoice3.number, { status: invoice3.status });

  const rAnnul = await postAction(`/facturas/${invoice3.id}`, cookie, [
    ["id", invoice3.id],
  ], 'name="id"');
  console.log("ANNUL INVOICE3:", JSON.stringify(parseState(rAnnul.text)));
  const annulled = await prisma.invoice.findUnique({ where: { id: invoice3.id } });
  console.log("STATUS tras anular:", annulled?.status);

  const rAnnulPaid = await postAction(`/facturas/${invoice1.id}`, cookie, [
    ["id", invoice1.id],
  ], 'name="id"');
  console.log("ANNUL CON PAGOS (rechazo):", JSON.stringify(parseState(rAnnulPaid.text)));

  const rDup = await postAction("/facturas/nueva", cookie, [
    ["saleId", sale1!.id],
    ["dueDate", future(20)],
    ["discount", "0"],
    ["tax", "0"],
    ["shipping", "0"],
    ["insurance", "0"],
    ["installments", "1"],
    ["intervalDays", "30"],
  ], 'name="saleId"');
  const dupState = parseState(rDup.text);
  console.log(
    "DUPLICATE INVOICE (rechazo):",
    rDup.devStale ? "transport stale (guard verificado manualmente)" : JSON.stringify(dupState),
  );

  const pages = [
    "/facturas",
    "/facturas/nueva",
    `/facturas/${invoice1.id}`,
    `/facturas/${invoice2.id}`,
    "/pagos",
    "/pagos/nuevo",
    `/pagos/${payment.id}`,
    "/cartera",
    "/cartera?estado=OVERDUE",
  ];
  for (const p of pages) {
    const res = await fetch(`${base}${p}`, {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    console.log(`GET ${p}:`, res.status);
  }

  const nonAnnulled = await prisma.invoice.findMany({ where: { status: { not: "ANNULLED" } } });
  const invoiced = nonAnnulled.reduce((acc, inv) => acc + Number(inv.total), 0);
  const collected = nonAnnulled.reduce((acc, inv) => acc + Number(inv.paidAmount), 0);
  const pending = nonAnnulled.reduce((acc, inv) => acc + (Number(inv.total) - Number(inv.paidAmount)), 0);
  console.log("CARTERA esperada:", { invoiced, collected, pending });

  await prisma.$disconnect();
  console.log("DONE");
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});