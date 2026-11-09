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
  if (res.status >= 500) {
    const errMatch = text.match(/"message":"([^"]*)"/);
    log(`  500 body err: ${errMatch ? errMatch[1] : text.slice(0, 300)}`);
  }
  return { status: res.status, text };
}

const logLines: string[] = [];
function log(line: string) {
  logLines.push(line);
}

function parseState(text: string) {
  const m = text.match(/\["\$AUTHSTATE","([^"]*)"\]|("error":"[^"]*"|"success":true|"number":"[^"]*")/g);
  if (!m) return {};
  const joined = m.join(",");
  let error: string | undefined;
  let success = false;
  if (joined.includes('"success":true')) success = true;
  const errMatch = joined.match(/"error":"([^"]*)"/);
  if (errMatch) error = errMatch[1];
  return { error, success };
}

async function main() {
  const cookie = await login();
  console.log("LOGIN OK:", cookie.slice(0, 30));

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  await prisma.saleItem.deleteMany({});
  await prisma.saleCost.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.product.deleteMany({});

  const name = `Cliente Test ${Date.now()}`;
  const r1 = await postAction("/clientes/nuevo", cookie, [
    ["documentType", "CC"],
    ["documentNumber", `10${Date.now().toString().slice(-8)}`],
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
  console.log("CREATE CUSTOMER:", r1.status, JSON.stringify(parseState(r1.text)));

  const sku = `SKU-${Date.now().toString().slice(-6)}`;
  const r2 = await postAction("/productos/nuevo", cookie, [
    ["sku", sku],
    ["name", "Perfume Test"],
    ["description", "Prueba"],
    ["categoryId", ""],
    ["brand", "TestBrand"],
    ["unit", "ML"],
    ["referenceCost", "50000"],
    ["referencePrice", "120000"],
    ["status", "ACTIVE"],
  ], 'name="sku"');
  console.log("CREATE PRODUCT:", r2.status, JSON.stringify(parseState(r2.text)));

  const items = JSON.stringify([
    {
      productId: null,
      productName: "Perfume Test",
      quantity: 2,
      unitCost: 50000,
      unitPrice: 120000,
      discount: 5000,
    },
    {
      productId: null,
      productName: "Crema Test",
      quantity: 1,
      unitCost: 30000,
      unitPrice: 70000,
      discount: 0,
    },
  ]);
  const costs = JSON.stringify([
    { type: "SHIPPING", description: "Envío", amount: 10000 },
  ]);

  const r3 = await postAction("/ventas/nueva", cookie, [
    ["customerId", ""],
    ["saleDate", new Date().toISOString().slice(0, 10)],
    ["company", ""],
    ["observations", "Venta de prueba"],
    ["items", items],
    ["costs", costs],
  ], 'name="items"');
  console.log("CREATE SALE (no customerId):", r3.status, JSON.stringify(parseState(r3.text)));

  const customer = await prisma.customer.findFirst({ where: { name }, orderBy: { createdAt: "desc" } });
  if (!customer) throw new Error("no customer");

  const r4 = await postAction("/ventas/nueva", cookie, [
    ["customerId", customer.id],
    ["saleDate", new Date().toISOString().slice(0, 10)],
    ["observations", "Venta de prueba"],
    ["items", items],
    ["costs", costs],
  ], 'name="items"');
  console.log("CREATE SALE:", r4.status, JSON.stringify(parseState(r4.text)));

  const sale = await prisma.sale.findFirst({ orderBy: { createdAt: "desc" } });
  if (!sale) throw new Error("no sale");
  console.log("SALE:", sale.number, {
    subtotal: sale.subtotal.toString(),
    totalCost: sale.totalCost.toString(),
    profit: sale.profit.toString(),
    margin: sale.margin.toString(),
  });

  const r5 = await postAction("/ventas/nueva", cookie, [
    ["customerId", customer.id],
    ["saleDate", new Date().toISOString().slice(0, 10)],
    ["observations", ""],
    ["items", items],
    ["costs", costs],
  ], 'name="items"');
  console.log("CREATE SALE 2:", r5.status, JSON.stringify(parseState(r5.text)));
  const sale2 = await prisma.sale.findFirst({
    where: { number: { not: sale.number } },
    orderBy: { createdAt: "desc" },
  });
  console.log("SALE 2 number:", sale2?.number, "| única:", sale.number !== sale2?.number);

  const r6 = await postAction("/despachos/nuevo", cookie, [
    ["saleId", sale2!.id],
    ["shipmentDate", new Date().toISOString().slice(0, 10)],
    ["carrier", "Servientrega"],
    ["trackingNumber", "TRK-001"],
    ["shippingCost", "15000"],
    ["insurance", "0"],
    ["estimatedDeliveryDate", ""],
    ["deliveredDate", ""],
    ["details", ""],
    ["status", "PENDING"],
  ], 'name="saleId"');
  console.log("CREATE SHIPMENT:", r6.status, JSON.stringify(parseState(r6.text)));

  const shipment = await prisma.shipment.findFirst({
    where: { saleId: sale2!.id },
    orderBy: { createdAt: "desc" },
  });
  if (!shipment) throw new Error("no shipment");
  console.log("SHIPMENT:", shipment.id.slice(0, 8), shipment.carrier, shipment.shippingCost.toString());

  const r7 = await postAction("/despachos/nuevo", cookie, [
    ["saleId", "bogus"],
    ["shipmentDate", new Date().toISOString().slice(0, 10)],
    ["carrier", "X"],
    ["trackingNumber", ""],
    ["shippingCost", "0"],
    ["insurance", "0"],
    ["estimatedDeliveryDate", ""],
    ["deliveredDate", ""],
    ["details", ""],
    ["status", "PENDING"],
  ], 'name="saleId"');
  console.log("CREATE SHIPMENT (no sale):", r7.status, JSON.stringify(parseState(r7.text)));

  const pages = [
    "/clientes",
    `/clientes/${customer.id}`,
    "/productos",
    "/ventas",
    `/ventas/${sale.id}`,
    `/ventas/${sale2!.id}`,
    "/despachos",
    `/despachos/${shipment.id}`,
  ];
  for (const p of pages) {
    const res = await fetch(`${base}${p}`, {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    console.log(`GET ${p}:`, res.status);
  }

  await prisma.$disconnect();
  console.log(logLines.join("\n"));
  console.log("DONE");
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});