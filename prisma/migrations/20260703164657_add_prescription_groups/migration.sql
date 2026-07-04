-- CreateTable
CREATE TABLE "prescription_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescription_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prescription_groups_tenantId_doctorId_sectionType_idx" ON "prescription_groups"("tenantId", "doctorId", "sectionType");

-- CreateIndex
CREATE UNIQUE INDEX "prescription_groups_tenantId_doctorId_sectionType_name_key" ON "prescription_groups"("tenantId", "doctorId", "sectionType", "name");

-- AddForeignKey
ALTER TABLE "prescription_groups" ADD CONSTRAINT "prescription_groups_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
