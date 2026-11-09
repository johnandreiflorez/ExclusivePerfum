import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const roles = [
  { name: "ADMIN", description: "Acceso completo al sistema" },
  { name: "SALES", description: "Consulta y creación de clientes, productos y ventas" },
  { name: "FINANCE", description: "Gestión de facturas, pagos, cartera e inversores" },
  { name: "VIEWER", description: "Acceso de solo lectura" },
];

const permissions = [
  { key: "users.manage", name: "Gestionar usuarios" },
  { key: "customers.manage", name: "Gestionar clientes" },
  { key: "customers.create", name: "Crear clientes" },
  { key: "products.manage", name: "Gestionar productos" },
  { key: "shipments.manage", name: "Gestionar despachos" },
  { key: "sales.manage", name: "Gestionar ventas" },
  { key: "sales.create", name: "Crear ventas" },
  { key: "sales.view", name: "Consultar ventas" },
  { key: "invoices.manage", name: "Gestionar facturas" },
  { key: "invoices.view", name: "Consultar facturas" },
  { key: "payments.manage", name: "Registrar y aplicar pagos" },
  { key: "payments.view", name: "Consultar pagos" },
  { key: "portfolio.view", name: "Consultar cartera" },
  { key: "investors.manage", name: "Gestionar inversores" },
  { key: "investors.view", name: "Consultar inversores" },
  { key: "investments.manage", name: "Gestionar inversiones" },
  { key: "investments.view", name: "Consultar inversiones" },
  { key: "profits.manage", name: "Gestionar ganancias" },
  { key: "profits.view", name: "Consultar ganancias" },
  { key: "expenses.manage", name: "Registrar gastos" },
  { key: "reports.view", name: "Consultar reportes" },
  { key: "audit.view", name: "Consultar auditoría" },
  { key: "settings.manage", name: "Configurar parámetros" },
];

const productCategories = [
  { name: "Perfumes", description: "Fragancias para hombre y mujer" },
  { name: "Ropa interior", description: "Prendas y accesorios" },
  { name: "Zapatos", description: "Calzado" },
  { name: "Accesorios", description: "Bolsos, cinturones y otros" },
];

async function main() {
  for (const category of productCategories) {
    await prisma.productCategory.upsert({
      where: { name: category.name },
      update: { description: category.description },
      create: category,
    });
  }
  console.log("Categorías de productos sincronizadas");

  const roleRecords = [];
  for (const role of roles) {
    roleRecords.push(
      await prisma.role.upsert({
        where: { name: role.name },
        update: { description: role.description },
        create: role,
      }),
    );
  }

  const adminRole = roleRecords.find((r) => r.name === "ADMIN");
  if (!adminRole) throw new Error("ADMIN role missing");

  const permissionRecords = [];
  for (const permission of permissions) {
    permissionRecords.push(
      await prisma.permission.upsert({
        where: { key: permission.key },
        update: { name: permission.name },
        create: permission,
      }),
    );
  }

  await prisma.role.update({
    where: { id: adminRole.id },
    data: {
      permissions: {
        connect: permissionRecords.map((p) => ({ id: p.id })),
      },
    },
  });

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@exclusiveperfum.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin123!";

  const hashed = await hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hashed, status: "ACTIVE" },
    create: {
      email: adminEmail,
      passwordHash: hashed,
      name: "Administrador",
      status: "ACTIVE",
      roles: {
        create: [{ roleId: adminRole.id }],
      },
    },
  });

  console.log(`Seed completado. Admin creado/actualizado: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });