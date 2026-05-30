import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrismaService } from "../prisma/prisma.service";
import {
  buildMedicineSearchText,
  normalizeSearchText
} from "../../common/utils/search-normalizer";

type MedicineCsvRow = {
  Company?: string;
  "Trade Name"?: string;
  "Generic Name With Strength"?: string;
  "Dosage Form"?: string;
  "DAR No"?: string;
  price?: string;
  Price?: string;
  Category?: string;
};

@Injectable()
export class MedicineImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importCsv(filePath: string, source = "dgda-csv", tenantId?: string) {
    const csvText = await readFile(filePath, "utf8");
    const rows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    }) as MedicineCsvRow[];

    const records: Prisma.MedicineCreateManyInput[] = [];
    let invalid = 0;

    for (const row of rows) {
      const brandName = row["Trade Name"]?.trim();
      const genericWithStrength = row["Generic Name With Strength"]?.trim();
      if (!brandName || !genericWithStrength) {
        invalid += 1;
        continue;
      }

      const { genericName, strength } = splitGenericAndStrength(genericWithStrength);
      const companyName = row.Company?.trim() || null;
      const dosageForm = row["Dosage Form"]?.trim() || null;
      const darNo = row["DAR No"]?.trim() || null;
      const stableKey = buildStableKey(row, source);

      records.push({
        tenantId,
        globalKey: tenantId ? null : stableKey,
        tenantKey: tenantId ? stableKey : null,
        brandName,
        genericName,
        companyName,
        strength,
        dosageForm,
        darNo,
        category: row.Category?.trim() || null,
        price: parsePrice(row.Price ?? row.price),
        source,
        normalizedBrand: normalizeSearchText(brandName),
        normalizedGeneric: normalizeSearchText(genericName),
        normalizedCompany: companyName ? normalizeSearchText(companyName) : null,
        searchText: buildMedicineSearchText({
          brandName,
          genericName,
          companyName,
          strength,
          dosageForm
        }),
        importedAt: new Date()
      });
    }

    let imported = 0;
    for (const chunk of chunkRecords(records, 1000)) {
      const result = await this.prisma.medicine.createMany({
        data: chunk,
        skipDuplicates: true
      });
      imported += result.count;
    }

    return {
      imported,
      skipped: invalid + records.length - imported,
      total: rows.length
    };
  }
}

function splitGenericAndStrength(value: string) {
  const match = value.match(
    /((?:\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|kg|%)\b(?:\s*\+\s*)?)+)$/i
  );
  if (!match) {
    return { genericName: value, strength: null };
  }

  const strength = match[1].trim();
  const genericName = value.slice(0, match.index).trim() || value;
  return { genericName, strength };
}

function parsePrice(value?: string) {
  if (!value) return null;
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? new Prisma.Decimal(parsed) : null;
}

function buildStableKey(row: MedicineCsvRow, source: string) {
  const stable = [
    source,
    row["DAR No"]?.trim(),
    row.Company?.trim(),
    row["Trade Name"]?.trim(),
    row["Generic Name With Strength"]?.trim(),
    row["Dosage Form"]?.trim()
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase();
  return createHash("sha256").update(stable).digest("hex");
}

function chunkRecords<T>(records: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < records.length; index += size) {
    chunks.push(records.slice(index, index + size));
  }
  return chunks;
}
