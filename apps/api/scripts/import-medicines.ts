import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../src/modules/prisma/prisma.service";
import { MedicineImportService } from "../src/modules/medicines/medicine-import.service";

async function main() {
  const config = new ConfigService();
  const filePath =
    process.argv.slice(2).find((arg) => arg !== "--") ??
    config.get<string>("MEDICINE_IMPORT_PATH");

  if (!filePath) {
    throw new Error("Provide a CSV path: pnpm medicine:import -- <path>");
  }

  const prisma = new PrismaService();
  await prisma.$connect();

  const importer = new MedicineImportService(prisma);
  const result = await importer.importCsv(filePath, "dgda-csv");
  console.log(result);

  await prisma.$disconnect();
}

void main();
