BEGIN;
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('host', 'tenant', 'viewer');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('vacant', 'occupied', 'reserved', 'maintenance');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('premium', 'standard');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('unpaid', 'paid', 'overdue');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('new', 'contacted', 'accepted', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isDepositPaid" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" UUID,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "propertyId" UUID NOT NULL,
    "type" "RoomType" NOT NULL DEFAULT 'standard',
    "code" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "area" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "deposit" DECIMAL(18,2) NOT NULL,
    "electricityRate" DECIMAL(18,2) NOT NULL,
    "waterRate" DECIMAL(18,2) NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'vacant',
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL DEFAULT '',
    "listed" BOOLEAN NOT NULL DEFAULT false,
    "maxOccupants" INTEGER NOT NULL DEFAULT 1,
    "currentOccupantsCount" INTEGER NOT NULL DEFAULT 0,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "idNumber" TEXT,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "roomId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "monthlyRent" DECIMAL(18,2) NOT NULL,
    "deposit" DECIMAL(18,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "contractId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "rent" DECIMAL(18,2) NOT NULL,
    "electricityRate" DECIMAL(18,2) NOT NULL,
    "waterRate" DECIMAL(18,2) NOT NULL,
    "electricityOld" DECIMAL(14,3) NOT NULL,
    "electricityNew" DECIMAL(14,3) NOT NULL,
    "waterOld" DECIMAL(14,3) NOT NULL,
    "waterNew" DECIMAL(14,3) NOT NULL,
    "other" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherNote" TEXT NOT NULL DEFAULT '',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'unpaid',
    "paidAt" TIMESTAMPTZ(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "roomId" UUID NOT NULL,
    "userId" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "status" "InquiryStatus" NOT NULL DEFAULT 'new',

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairRequest" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "roomId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "RepairStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "RepairRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "userId" UUID NOT NULL,
    "roomId" UUID NOT NULL,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_key" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");

-- CreateIndex
CREATE INDEX "Room_listed_status_idx" ON "Room"("listed", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Room_propertyId_code_key" ON "Room"("propertyId", "code");

-- CreateIndex
CREATE INDEX "Tenant_phone_idx" ON "Tenant"("phone");

-- CreateIndex
CREATE INDEX "Contract_roomId_active_idx" ON "Contract"("roomId", "active");

-- CreateIndex
CREATE INDEX "Contract_tenantId_active_idx" ON "Contract"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_id_roomId_tenantId_key" ON "Contract"("id", "roomId", "tenantId");

-- CreateIndex
CREATE INDEX "Invoice_contractId_roomId_tenantId_idx" ON "Invoice"("contractId", "roomId", "tenantId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Invoice_status_paidAt_idx" ON "Invoice"("status", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_roomId_period_key" ON "Invoice"("roomId", "period");

-- CreateIndex
CREATE INDEX "Inquiry_roomId_status_idx" ON "Inquiry"("roomId", "status");

-- CreateIndex
CREATE INDEX "Inquiry_userId_status_idx" ON "Inquiry"("userId", "status");

-- CreateIndex
CREATE INDEX "RepairRequest_roomId_status_idx" ON "RepairRequest"("roomId", "status");

-- CreateIndex
CREATE INDEX "RepairRequest_tenantId_status_idx" ON "RepairRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Favorite_roomId_idx" ON "Favorite"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_roomId_key" ON "Favorite"("userId", "roomId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_roomId_tenantId_fkey" FOREIGN KEY ("contractId", "roomId", "tenantId") REFERENCES "Contract"("id", "roomId", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairRequest" ADD CONSTRAINT "RepairRequest_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairRequest" ADD CONSTRAINT "RepairRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- REVIEW ONLY: append to the initial migration BEFORE applying it.
-- This file has NOT been executed. Required alongside schema.prisma.
CREATE UNIQUE INDEX "Contract_one_active_room" ON "Contract" ("roomId") WHERE active;
CREATE UNIQUE INDEX "Contract_one_active_tenant" ON "Contract" ("tenantId") WHERE active;
CREATE UNIQUE INDEX "Inquiry_one_open_request" ON "Inquiry" ("userId", "roomId")
  WHERE "userId" IS NOT NULL AND status IN ('new', 'contacted', 'accepted');
ALTER TABLE "User" ADD CONSTRAINT "User_username_normalized"
  CHECK (username = lower(btrim(username)) AND length(username) > 0);
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_valid_values"
  CHECK (("endDate" IS NULL OR "endDate" > "startDate") AND "monthlyRent" > 0 AND deposit >= 0);
ALTER TABLE "Room" ADD CONSTRAINT "Room_valid_values"
  CHECK (area > 0 AND price >= 0 AND deposit >= 0 AND "electricityRate" >= 0
    AND "waterRate" >= 0 AND "maxOccupants" > 0
    AND "currentOccupantsCount" BETWEEN 0 AND "maxOccupants");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_valid_values"
  CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    AND rent >= 0 AND other >= 0 AND "electricityRate" >= 0 AND "waterRate" >= 0
    AND "electricityOld" >= 0 AND "electricityNew" >= "electricityOld"
    AND "waterOld" >= 0 AND "waterNew" >= "waterOld"
    AND ((status = 'paid' AND "paidAt" IS NOT NULL) OR (status <> 'paid' AND "paidAt" IS NULL)));

COMMIT;
