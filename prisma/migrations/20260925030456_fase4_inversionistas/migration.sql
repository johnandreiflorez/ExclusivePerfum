-- CreateEnum
CREATE TYPE "InvestorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('APORTE', 'RETIRO', 'DEVOLUCION', 'AJUSTE');

-- CreateEnum
CREATE TYPE "ProfitDistributionStatus" AS ENUM ('GENERADA', 'PENDIENTE_PAGO', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "InvestorPaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'DEPOSIT', 'CARD', 'OTHER');

-- CreateTable
CREATE TABLE "Investor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "CustomerDocumentType",
    "documentNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "InvestorStatus" NOT NULL DEFAULT 'ACTIVE',
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "investmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "InvestmentType" NOT NULL DEFAULT 'APORTE',
    "amount" DECIMAL(18,2) NOT NULL,
    "reference" TEXT,
    "observations" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleInvestor" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "SaleInvestor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitDistribution" (
    "id" TEXT NOT NULL,
    "saleInvestorId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "expectedAmount" DECIMAL(18,2) NOT NULL,
    "recognizedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "ProfitDistributionStatus" NOT NULL DEFAULT 'GENERADA',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfitDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorPayment" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(18,2) NOT NULL,
    "method" "InvestorPaymentMethod" NOT NULL DEFAULT 'OTHER',
    "reference" TEXT,
    "observations" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorPaymentAllocation" (
    "id" TEXT NOT NULL,
    "investorPaymentId" TEXT NOT NULL,
    "profitDistributionId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorPaymentCounter" (
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvestorPaymentCounter_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE INDEX "Investor_name_idx" ON "Investor"("name");

-- CreateIndex
CREATE INDEX "Investor_status_idx" ON "Investor"("status");

-- CreateIndex
CREATE INDEX "Investment_investorId_idx" ON "Investment"("investorId");

-- CreateIndex
CREATE INDEX "Investment_investmentDate_idx" ON "Investment"("investmentDate");

-- CreateIndex
CREATE INDEX "SaleInvestor_investorId_idx" ON "SaleInvestor"("investorId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleInvestor_saleId_investorId_key" ON "SaleInvestor"("saleId", "investorId");

-- CreateIndex
CREATE INDEX "ProfitDistribution_investorId_idx" ON "ProfitDistribution"("investorId");

-- CreateIndex
CREATE INDEX "ProfitDistribution_invoiceId_idx" ON "ProfitDistribution"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfitDistribution_saleInvestorId_invoiceId_key" ON "ProfitDistribution"("saleInvestorId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorPayment_number_key" ON "InvestorPayment"("number");

-- CreateIndex
CREATE INDEX "InvestorPayment_investorId_idx" ON "InvestorPayment"("investorId");

-- CreateIndex
CREATE INDEX "InvestorPayment_paymentDate_idx" ON "InvestorPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "InvestorPaymentAllocation_investorPaymentId_idx" ON "InvestorPaymentAllocation"("investorPaymentId");

-- CreateIndex
CREATE INDEX "InvestorPaymentAllocation_profitDistributionId_idx" ON "InvestorPaymentAllocation"("profitDistributionId");

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleInvestor" ADD CONSTRAINT "SaleInvestor_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleInvestor" ADD CONSTRAINT "SaleInvestor_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistribution" ADD CONSTRAINT "ProfitDistribution_saleInvestorId_fkey" FOREIGN KEY ("saleInvestorId") REFERENCES "SaleInvestor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistribution" ADD CONSTRAINT "ProfitDistribution_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistribution" ADD CONSTRAINT "ProfitDistribution_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorPayment" ADD CONSTRAINT "InvestorPayment_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorPayment" ADD CONSTRAINT "InvestorPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorPaymentAllocation" ADD CONSTRAINT "InvestorPaymentAllocation_investorPaymentId_fkey" FOREIGN KEY ("investorPaymentId") REFERENCES "InvestorPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorPaymentAllocation" ADD CONSTRAINT "InvestorPaymentAllocation_profitDistributionId_fkey" FOREIGN KEY ("profitDistributionId") REFERENCES "ProfitDistribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
