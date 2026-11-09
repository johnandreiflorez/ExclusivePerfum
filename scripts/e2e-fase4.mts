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
  for (let attempt = 0; attempt < 4; attempt++) {
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
      console.log(`  devStale en ${path} (intento ${attempt + 1})...`);
      await new Promise((r) => setTimeout(r, 4000));
      continue;
    }
    if (res.status >= 500) {
      const errMatch = text.match(/"message":"([^"]*)"/);
      console.log(`  500 body err: ${errMatch ? errMatch[1] : text.slice(0, 300)}`);
    }
    return { status: res.status, text };
  }
  throw new Error(`devStale repetido en ${path}`);
}

function parseState(text: string) {
  const success = text.includes('"success":true');
  const errMatch = text.match(/"error":"([^"]*)"/);
  const numMatch = text.match(/"number":"([^"]*)"/);
  return { error: errMatch ? errMatch[1] : undefined, success, number: numMatch ? numMatch[1] : undefined };
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

  const stamp = Date.now().toString().slice(-8);
  const investorA = `Inversor A ${stamp}`;
  const investorB = `Inversor B ${stamp}`;

  const createInvestor = async (name: string, doc: string, phone: string) => {
    const res = await postAction("/inversores/nuevo", cookie, [
      ["name", name],
      ["entryDate", isoDay(new Date())],
      ["documentType", "CC"],
      ["documentNumber", doc],
      ["phone", phone],
      ["email", ""],
      ["observations", "e2e F4"],
      ["status", "ACTIVE"],
    ], 'name="name"');
    const state = parseState(res.text);
    console.log(`CREATE INVESTOR ${name}:`, res.status, JSON.stringify(state));
    if (!state.success) throw new Error(`investor create failed: ${state.error}`);
  };

  await createInvestor(investorA, `1${stamp}`, "3001112222");
  await createInvestor(investorB, `2${stamp}`, "3003334444");

  const invA = await prisma.investor.findFirst({ where: { name: investorA } });
  const invB = await prisma.investor.findFirst({ where: { name: investorB } });
  if (!invA || !invB) throw new Error("investors not found");

  const createInvestment = async (investorId: string, type: string, amount: string, expectError?: string) => {
    const res = await postAction("/inversiones/nueva", cookie, [
      ["investorId", investorId],
      ["investmentDate", isoDay(new Date())],
      ["type", type],
      ["amount", amount],
      ["reference", "E2E-F4"],
      ["observations", "e2e"],
    ], 'name="investorId"');
    const state = parseState(res.text);
    console.log(`CREATE INVESTMENT ${type} ${amount}:`, res.status, JSON.stringify(state));
    if (expectError) {
      if (state.success) throw new Error(`se esperaba rechazo para ${type} ${amount}`);
      if (!(state.error ?? "").includes(expectError)) throw new Error(`mensaje inesperado: ${state.error}`);
    } else if (!state.success) {
      throw new Error(`investment failed: ${state.error}`);
    }
  };

  await createInvestment(invA.id, "APORTE", "250000");
  await createInvestment(invB.id, "APORTE", "150000");
  await createInvestment(invA.id, "RETIRO", "-1000", "El valor no puede ser negativo");
  await createInvestment(invA.id, "AJUSTE", "0", "El valor debe ser diferente de 0");

  const investmentsA = await prisma.investment.findMany({ where: { investorId: invA.id } });
  const investmentsB = await prisma.investment.findMany({ where: { investorId: invB.id } });
  console.log("CAPITAL A:", investmentsA.reduce((acc, i) => acc + Number(i.amount), 0));
  console.log("CAPITAL B:", investmentsB.reduce((acc, i) => acc + Number(i.amount), 0));

  const saleCountBefore = await prisma.sale.count();

  const investorsJsonGood = JSON.stringify([
    { investorId: invA.id, amount: 72000, percentage: 60 },
    { investorId: invB.id, amount: 48000, percentage: 40 },
  ]);

  const customers = await prisma.customer.findFirst();
  if (customers) throw new Error("ejecutar solo contra entorno limpio (se elimina la cartera)");

  const customerName = `Cliente F4 ${stamp}`;
  const rCustomer = await postAction("/clientes/nuevo", cookie, [
    ["documentType", "CC"],
    ["documentNumber", `9${stamp}`],
    ["name", customerName],
    ["phone", "3001234567"],
    ["email", ""],
    ["address", "Calle 1"],
    ["city", "Bogotá"],
    ["department", "Cundinamarca"],
    ["observations", ""],
    ["status", "ACTIVE"],
    ["redirectTo", "/clientes"],
  ], 'name="documentType"');
  console.log("CREATE CUSTOMER:", rCustomer.status, JSON.stringify(parseState(rCustomer.text)));
  const customer = await prisma.customer.findFirst({ where: { name: customerName } });
  if (!customer) throw new Error("no se creó el cliente");

  const createSale = async (investors: string, customerId: string, saleName: string) => {
    const items = JSON.stringify([
      {
        productId: null,
        productName: saleName,
        quantity: 2,
        unitCost: 40000,
        unitPrice: 100000,
        discount: 0,
      },
    ]);
    const costs = JSON.stringify([]);
    return postAction("/ventas/nueva", cookie, [
      ["customerId", customerId],
      ["saleDate", isoDay(new Date())],
      ["observations", "Venta F4"],
      ["items", items],
      ["costs", costs],
      ["investors", investors],
    ], 'name="items"');
  };

  const rSaleA = await createSale(investorsJsonGood, customer.id, `Perfume A ${stamp}`);
  console.log("CREATE SALE A (60/40):", rSaleA.status, JSON.stringify(parseState(rSaleA.text)));

  const rBadTotal = await createSale(
    JSON.stringify([{ investorId: invA.id, amount: 120000, percentage: 50 }]),
    customer.id,
    `Perfume RN006 ${stamp}`,
  );
  const badTotalState = parseState(rBadTotal.text);
  console.log("RN-006 suma != 100 (rechazo):", JSON.stringify(badTotalState));
  if (badTotalState.success || !(badTotalState.error ?? "").includes("100%")) {
    throw new Error(`RN-006 row total no rechazado bien: ${badTotalState.error}`);
  }

  const rBadDup = await createSale(
    JSON.stringify([
      { investorId: invA.id, amount: 60000, percentage: 60 },
      { investorId: invA.id, amount: 40000, percentage: 40 },
    ]),
    customer.id,
    `Perfume Dup ${stamp}`,
  );
  const badDupState = parseState(rBadDup.text);
  console.log("RN-006 inversor duplicado (rechazo):", JSON.stringify(badDupState));
  if (badDupState.success || !(badDupState.error ?? "").includes("repetirse")) {
    throw new Error(`RN-006 duplicado no rechazado bien: ${badDupState.error}`);
  }

  const saleAfterBad = await prisma.sale.count();
  if (saleAfterBad !== saleCountBefore + 1) {
    throw new Error(`las ventas inválidas no debieron crear registros: ${saleAfterBad}`);
  }
  console.log("N ventas tras rechazos RN-006:", saleAfterBad);

  const saleA = await prisma.sale.findFirst({
    where: { number: { not: { startsWith: "zzz" } } },
    orderBy: { createdAt: "desc" },
  });
  if (!saleA) throw new Error("no saleA");
  console.log("SALE A:", saleA.number, {
    subtotal: saleA.subtotal.toString(),
    totalCost: saleA.totalCost.toString(),
    profit: saleA.profit.toString(),
  });

  const createInvoice = (saleId: string, due: string) =>
    postAction("/facturas/nueva", cookie, [
      ["saleId", saleId],
      ["dueDate", due],
      ["discount", "0"],
      ["tax", "0"],
      ["shipping", "0"],
      ["insurance", "0"],
      ["installments", "1"],
      ["intervalDays", "30"],
    ], 'name="saleId"');

  const rInvA = await createInvoice(saleA.id, future(20));
  console.log("CREATE INVOICE A:", rInvA.status, JSON.stringify(parseState(rInvA.text)));
  const invoiceA = await prisma.invoice.findFirst({ orderBy: { createdAt: "desc" } });
  if (!invoiceA) throw new Error("no invoiceA");
  console.log("INVOICE A:", invoiceA.number, { total: invoiceA.total.toString() });

  const registerPayment = async (invoiceId: string, amount: number, ref: string, customerId: string) => {
    const allocations = JSON.stringify([{ invoiceId, amount }]);
    const res = await postAction("/pagos/nuevo", cookie, [
      ["customerId", customerId],
      ["paymentDate", isoDay(new Date())],
      ["method", "TRANSFER"],
      ["reference", ref],
      ["observations", "Pago e2e F4"],
      ["allocations", allocations],
    ], 'name="allocations"');
    const state = parseState(res.text);
    console.log(`PAY ${ref} ${amount}:`, res.status, JSON.stringify(state));
    if (!state.success) throw new Error(`payment failed ${ref}: ${state.error}`);
  };

  await registerPayment(invoiceA.id, 60000, "F4-P1", customer.id);

  let dA = await prisma.profitDistribution.findFirst({ where: { invoiceId: invoiceA.id, investorId: invA.id } });
  let dB = await prisma.profitDistribution.findFirst({ where: { invoiceId: invoiceA.id, investorId: invB.id } });
  if (!dA || !dB) throw new Error("distribuciones no creadas tras cobro parcial");
  console.log("RECONOCIMIENTO tras 60k:", { A: dA.recognizedAmount.toString(), B: dB.recognizedAmount.toString(), sA: dA.status, sB: dB.status });
  if (dA.recognizedAmount.toString() !== "21600" || dB.recognizedAmount.toString() !== "14400") {
    throw new Error("reconocimiento parcial incorrecto");
  }
  if (dA.status !== "GENERADA" || dB.status !== "GENERADA") {
    throw new Error("estado tras cobro parcial debería ser GENERADA");
  }

  await registerPayment(invoiceA.id, 140000, "F4-P2", customer.id);

  dA = (await prisma.profitDistribution.findFirst({ where: { id: dA.id } }))!;
  dB = (await prisma.profitDistribution.findFirst({ where: { id: dB.id } }))!;
  console.log("RECONOCIMIENTO total:", { A: dA.recognizedAmount.toString(), B: dB.recognizedAmount.toString(), sA: dA.status, sB: dB.status });
  if (dA.recognizedAmount.toString() !== "72000" || dB.recognizedAmount.toString() !== "48000") {
    throw new Error("reconocimiento total incorrecto");
  }
  if (dA.status !== "PENDIENTE_PAGO" || dB.status !== "PENDIENTE_PAGO") {
    throw new Error("estado tras cobro total debería ser PENDIENTE_PAGO");
  }

  const registerInvestorPayment = async (investorId: string, allocations: { profitDistributionId: string; amount: number }[], expectError?: string) => {
    const allocJson = JSON.stringify(allocations);
    const res = await postAction("/pagos-inversores/nuevo", cookie, [
      ["investorId", investorId],
      ["paymentDate", isoDay(new Date())],
      ["method", "TRANSFER"],
      ["reference", "IP-F4"],
      ["observations", "Pago inversionista e2e"],
      ["allocations", allocJson],
    ], 'name="investorId"');
    const state = parseState(res.text);
    console.log(`INV PAY ${allocations.length} ats:`, res.status, JSON.stringify(state));
    if (expectError) {
      if (state.success) throw new Error(`se esperaba rechazo del pago a inversor`);
      if (!(state.error ?? "").includes(expectError)) throw new Error(`mensaje inesperado: ${state.error}`);
      return undefined;
    }
    if (!state.success) throw new Error(`investor payment failed: ${state.error}`);
    return state.number;
  };

  const numberIP1 = await registerInvestorPayment(invA.id, [{ profitDistributionId: dA.id, amount: 72000 }]);
  console.log("NUMBER PAGO INV A:", numberIP1);
  if (!numberIP1?.startsWith(`IP-${today.getFullYear()}-`)) throw new Error("numeración IP incorrecta");

  dA = (await prisma.profitDistribution.findFirst({ where: { id: dA.id } }))!;
  console.log("DISTRIB A tras pago:", { paid: dA.paidAmount.toString(), status: dA.status });
  if (dA.paidAmount.toString() !== "72000" || dA.status !== "PAGADA") {
    throw new Error("pago a inversor no aplicó correctamente");
  }

  await registerInvestorPayment(invB.id, [{ profitDistributionId: dB.id, amount: 48001 }], "No se puede pagar más del disponible");

  await registerInvestorPayment(invB.id, [{ profitDistributionId: dB.id, amount: 48000 }]);
  dB = (await prisma.profitDistribution.findFirst({ where: { id: dB.id } }))!;
  console.log("DISTRIB B tras pago:", { paid: dB.paidAmount.toString(), status: dB.status });
  if (dB.paidAmount.toString() !== "48000" || dB.status !== "PAGADA") {
    throw new Error("pago total B incorrecto");
  }

  const paymentIP1 = await prisma.investorPayment.findFirst({ where: { number: numberIP1 } });
  if (!paymentIP1) throw new Error("no investorPayment");
  const allocs1 = await prisma.investorPaymentAllocation.findMany({ where: { investorPaymentId: paymentIP1.id } });
  console.log("ALLOCATIONS:", allocs1.length, allocs1.map((a) => a.amount.toString()));

  const saleBInv = JSON.stringify([{ investorId: invA.id, amount: 40000, percentage: 100 }]);
  const rSaleB = await createSale(saleBInv, customer.id, `Perfume B ${stamp}`);
  console.log("CREATE SALE B (100%):", rSaleB.status, JSON.stringify(parseState(rSaleB.text)));
  const saleB = await prisma.sale.findFirst({ where: { id: { not: saleA.id } }, orderBy: { createdAt: "desc" } });
  if (!saleB) throw new Error("no saleB");
  console.log("SALE B:", saleB.number, { profit: saleB.profit.toString() });

  await createInvoice(saleB.id, future(20));
  const invoiceB = await prisma.invoice.findFirst({ where: { saleId: saleB.id } });
  if (!invoiceB) throw new Error("no invoiceB");
  await registerPayment(invoiceB.id, Number(invoiceB.total), "F4-PB", customer.id);

  const dB2 = await prisma.profitDistribution.findFirst({ where: { invoiceId: invoiceB.id, investorId: invA.id } });
  if (!dB2 || dB2.status !== "PENDIENTE_PAGO") throw new Error("distribución de venta B no quedó pendiente");
  console.log("DISTRIB B2 (antes cancelar):", dB2.status, dB2.recognizedAmount.toString());

  const rCancel = await postAction(`/ventas/${saleB.id}`, cookie, [
    ["id", saleB.id],
    ["status", "CANCELLED"],
  ], 'name="id"');
  console.log("CANCEL SALE B:", JSON.stringify(parseState(rCancel.text)));
  const dB2After = await prisma.profitDistribution.findFirst({ where: { id: dB2.id } });
  console.log("DISTRIB B2 tras cancelar:", dB2After?.status);
  if (dB2After?.status !== "ANULADA") throw new Error("cancelación no anuló la distribución");

  await registerInvestorPayment(invA.id, [{ profitDistributionId: dB2After!.id, amount: 1 }], "La ganancia está anulada");

  const dAStill = (await prisma.profitDistribution.findFirst({ where: { id: dA.id } }))!;
  if (dAStill.status !== "PAGADA") throw new Error("la distribución PAGADA no debe alterarse");

  const pages = [
    "/inversores",
    "/inversores/nuevo",
    `/inversores/${invA.id}`,
    `/inversores/${invB.id}`,
    "/inversiones",
    "/inversiones/nueva",
    "/inversiones/nueva?investorId=" + invB.id,
    "/ganancias",
    `/ganancias?inversor=${invA.id}`,
    "/pagos-inversores",
    "/pagos-inversores/nuevo",
    `/pagos-inversores/${paymentIP1.id}`,
    `/ventas/${saleA.id}`,
    "/dashboard",
  ];
  for (const p of pages) {
    const res = await fetch(`${base}${p}`, {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    console.log(`GET ${p}:`, res.status);
    if (res.status !== 200) throw new Error(`GET ${p} falló con ${res.status}`);
  }

  const htmlInvestor = await (await fetch(`${base}/inversores/${invA.id}`, { headers: { Cookie: cookie } })).text();
  const hasPayout = htmlInvestor.includes("PAGADA") || htmlInvestor.includes("Pagada");
  console.log("Detalle inversor muestra pagos:", hasPayout);

  await prisma.$disconnect();
  console.log("DONE");
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});