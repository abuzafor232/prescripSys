/**
 * Import Bangladesh medicine dataset (DGDA CSV) into the Medicine table.
 * Usage: npx ts-node scripts/import-medicines.ts [/path/to/file.csv]
 * Default path: C:\Prescription System\medicine_information_export.csv
 */

import * as fs from "node:fs";
import { parse } from "csv-parse/sync";
import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";

// ── Config ────────────────────────────────────────────────────────────────

const DEFAULT_CSV =
  "C:/Prescription System/medicine_information_export.csv";
const SOURCE = "dgda-csv";
const BATCH  = 1000;

// ── Helpers (mirrors medicine-import.service.ts & search-normalizer.ts) ──

function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function buildSearchText(b: {
  brandName: string;
  genericName?: string | null;
  companyName?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
}): string {
  return normalizeSearchText(
    [b.brandName, b.genericName, b.companyName, b.dosageForm, b.strength]
      .filter(Boolean)
      .join(" ")
  );
}

function splitGenericAndStrength(value: string) {
  const match = value.match(
    /((?:\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|kg|%)\b(?:\s*\+\s*)?)+)$/i
  );
  if (!match) return { genericName: value, strength: null };
  const strength   = match[1].trim();
  const genericName = value.slice(0, match.index).trim() || value;
  return { genericName, strength };
}

function buildStableKey(row: Record<string, string>): string {
  const stable = [
    SOURCE,
    row["DAR No"],
    row["Company"],
    row["Trade Name"],
    row["Generic Name With Strength"],
    row["Dosage Form"]
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase();
  return createHash("sha256").update(stable).digest("hex");
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const filePath = process.argv[2] ?? DEFAULT_CSV;

  if (!fs.existsSync(filePath)) {
    console.error(`CSV not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`\nReading CSV: ${filePath}`);
  const csvText = fs.readFileSync(filePath, "utf8");
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  }) as Record<string, string>[];

  console.log(`Parsed ${rows.length} rows.\n`);

  const prisma = new PrismaClient();
  await prisma.$connect();

  const existing = await prisma.medicine.count({ where: { source: SOURCE } });
  console.log(`Already in DB (source="${SOURCE}"): ${existing}`);

  if (existing > 0) {
    console.log("Import skipped — data already present.");
    await prisma.$disconnect();
    return;
  }

  // Build records
  const records: Prisma.MedicineCreateManyInput[] = [];
  let invalid = 0;

  for (const row of rows) {
    const brandName          = row["Trade Name"]?.trim();
    const genericWithStrength = row["Generic Name With Strength"]?.trim();
    if (!brandName || !genericWithStrength) { invalid++; continue; }

    const { genericName, strength } = splitGenericAndStrength(genericWithStrength);
    const companyName = row["Company"]?.trim()    || null;
    const dosageForm  = row["Dosage Form"]?.trim() || null;
    const darNo       = row["DAR No"]?.trim()      || null;
    const globalKey   = buildStableKey(row);

    records.push({
      tenantId:          null,
      globalKey,
      brandName,
      genericName,
      companyName,
      strength,
      dosageForm,
      darNo,
      source:            SOURCE,
      normalizedBrand:   normalizeSearchText(brandName),
      normalizedGeneric: normalizeSearchText(genericName),
      normalizedCompany: companyName ? normalizeSearchText(companyName) : null,
      searchText:        buildSearchText({ brandName, genericName, companyName, strength, dosageForm }),
      isActive:          true,
      importedAt:        new Date()
    } satisfies Prisma.MedicineCreateManyInput);
  }

  console.log(
    `Prepared ${records.length} records (${invalid} skipped — missing Trade Name or Generic).`
  );

  // Batch insert with progress
  let inserted = 0;
  let skipped  = 0;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch  = records.slice(i, i + BATCH);
    const result = await prisma.medicine.createMany({
      data:           batch,
      skipDuplicates: true
    });
    inserted += result.count;
    skipped  += batch.length - result.count;

    const done = Math.min(i + BATCH, records.length);
    const pct  = Math.round((done / records.length) * 100);
    process.stdout.write(`\r  Progress: ${done.toLocaleString()} / ${records.length.toLocaleString()} (${pct}%)`);
  }

  console.log(`\n`);
  console.log(`✅ Import complete`);
  console.log(`   Inserted : ${inserted.toLocaleString()}`);
  console.log(`   Skipped  : ${skipped.toLocaleString()} (duplicates)`);
  console.log(`   Invalid  : ${invalid.toLocaleString()} (missing fields)`);
  console.log(`   Total DB : ${(await prisma.medicine.count({ where: { source: SOURCE } })).toLocaleString()}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
