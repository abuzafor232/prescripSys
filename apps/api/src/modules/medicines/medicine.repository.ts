import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import {
  buildMedicineSearchText,
  normalizeSearchText
} from "../../common/utils/search-normalizer";
import { CreateMedicineDto } from "./dto/create-medicine.dto";
import { UpdateMedicineDto } from "./dto/update-medicine.dto";
import { ListMedicinesDto } from "./dto/list-medicines.dto";

export type MedicineSearchRow = {
  id: string;
  brandName: string;
  genericName: string;
  companyName: string | null;
  strength: string | null;
  dosageForm: string | null;
  price: Prisma.Decimal | null;
  darNo: string | null;
  score: number;
};

type ListRow = {
  id: string;
  brandName: string;
  genericName: string;
  strength: string | null;
  companyName: string | null;
  dosageForm: string | null;
  darNo: string | null;
};

@Injectable()
export class MedicineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMedicineDto) {
    const globalKey = createHash("sha256")
      .update(
        ["manual", dto.brandName, dto.genericName, dto.dosageForm ?? "", dto.strength ?? "", dto.companyName ?? ""]
          .join("|")
          .toLowerCase()
      )
      .digest("hex");

    try {
      return await this.prisma.medicine.create({
        data: {
          tenantId:          null,
          globalKey,
          brandName:         dto.brandName,
          genericName:       dto.genericName,
          companyName:       dto.companyName ?? null,
          strength:          dto.strength    ?? null,
          dosageForm:        dto.dosageForm  ?? null,
          darNo:             dto.darNo       ?? null,
          source:            "manual",
          normalizedBrand:   normalizeSearchText(dto.brandName),
          normalizedGeneric: normalizeSearchText(dto.genericName),
          normalizedCompany: dto.companyName ? normalizeSearchText(dto.companyName) : null,
          searchText:        buildMedicineSearchText({
            brandName:   dto.brandName,
            genericName: dto.genericName,
            companyName: dto.companyName,
            dosageForm:  dto.dosageForm,
            strength:    dto.strength
          }),
          isActive:   true,
          importedAt: new Date()
        }
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("A medicine with these details already exists.");
      }
      throw e;
    }
  }

  async list(dto: ListMedicinesDto) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;
    const skip  = (page - 1) * limit;
    const term  = dto.q?.trim() ?? "";

    // When there's a search term, use raw SQL so we can ORDER BY relevance
    if (term) {
      return this.listWithRelevance(term, dto.searchType ?? null, page, limit, skip);
    }

    // No search term – use Prisma ORM, alphabetical
    const where: Prisma.MedicineWhereInput = { isActive: true, tenantId: null };


    const [data, total] = await this.prisma.$transaction([
      this.prisma.medicine.findMany({
        where,
        orderBy: { brandName: "asc" },
        skip,
        take: limit,
        select: {
          id: true, brandName: true, genericName: true, strength: true,
          companyName: true, dosageForm: true, darNo: true
        }
      }),
      this.prisma.medicine.count({ where })
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  private async listWithRelevance(
    term: string,
    searchType: "trade" | "generic" | null,
    page: number,
    limit: number,
    skip: number
  ) {
    const like      = `%${term}%`;
    const likeStart = `${term}%`;
    const normLike  = `%${normalizeSearchText(term)}%`;

    // Build the search condition based on selected type
    const searchClause =
      searchType === "trade"
        ? Prisma.sql`"brandName" ILIKE ${like}`
        : searchType === "generic"
          ? Prisma.sql`"genericName" ILIKE ${like}`
          : Prisma.sql`(
              "brandName"   ILIKE ${like}
              OR "genericName" ILIKE ${like}
              OR "companyName" ILIKE ${like}
              OR "darNo"       ILIKE ${like}
              OR "searchText"  ILIKE ${normLike}
            )`;

    const whereClause = Prisma.sql`
      "isActive" = true AND "tenantId" IS NULL AND ${searchClause}
    `;

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<ListRow[]>(Prisma.sql`
        SELECT
          id,
          "brandName",
          "genericName",
          strength,
          "companyName",
          "dosageForm",
          "darNo"
        FROM medicines
        WHERE ${whereClause}
        ORDER BY
          CASE
            WHEN LOWER("brandName")   = LOWER(${term})  THEN 0
            WHEN "brandName"          ILIKE ${likeStart} THEN 1
            WHEN LOWER("genericName") = LOWER(${term})  THEN 2
            WHEN "genericName"        ILIKE ${likeStart} THEN 3
            ELSE 4
          END,
          "brandName" ASC
        LIMIT ${limit} OFFSET ${skip}
      `),
      this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM medicines
        WHERE ${whereClause}
      `)
    ]);

    const total = Number(countRows[0].count);
    return {
      data:  rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async update(id: string, dto: UpdateMedicineDto) {
    const data: Prisma.MedicineUpdateInput = {};
    if (dto.brandName   !== undefined) {
      data.brandName        = dto.brandName;
      data.normalizedBrand  = normalizeSearchText(dto.brandName);
    }
    if (dto.genericName !== undefined) {
      data.genericName       = dto.genericName;
      data.normalizedGeneric = normalizeSearchText(dto.genericName);
    }
    if (dto.strength    !== undefined) data.strength    = dto.strength    || null;
    if (dto.dosageForm  !== undefined) data.dosageForm  = dto.dosageForm  || null;
    if (dto.companyName !== undefined) {
      data.companyName        = dto.companyName || null;
      data.normalizedCompany  = dto.companyName ? normalizeSearchText(dto.companyName) : null;
    }
    if (dto.darNo !== undefined) data.darNo = dto.darNo || null;

    const updated = await this.prisma.medicine.update({ where: { id }, data, select: {
      id: true, brandName: true, genericName: true, strength: true,
      companyName: true, dosageForm: true, darNo: true
    }});

    // Rebuild searchText after all field updates
    await this.prisma.medicine.update({
      where: { id },
      data: { searchText: buildMedicineSearchText({
        brandName:   updated.brandName,
        genericName: updated.genericName,
        companyName: updated.companyName ?? undefined,
        dosageForm:  updated.dosageForm  ?? undefined,
        strength:    updated.strength    ?? undefined,
      })}
    });

    return updated;
  }

  async delete(id: string) {
    return this.prisma.medicine.update({
      where: { id },
      data: { isActive: false },
      select: { id: true }
    });
  }

  async dosageForms(): Promise<string[]> {
    const rows = await this.prisma.medicine.findMany({
      where: { isActive: true, tenantId: null, dosageForm: { not: null } },
      select: { dosageForm: true },
      distinct: ["dosageForm"],
      orderBy: { dosageForm: "asc" }
    });
    return rows.map((r) => r.dosageForm!).filter(Boolean);
  }

  async search(tenantId: string, query: string, limit: number) {
    const q    = normalizeSearchText(query);
    const like = `%${q}%`;

    if (!q) {
      return this.prisma.medicine.findMany({
        where: {
          isActive: true,
          OR: [{ tenantId }, { tenantId: null }]
        },
        orderBy: [{ brandName: "asc" }],
        take: limit
      });
    }

    try {
      return await this.prisma.$queryRaw<MedicineSearchRow[]>(Prisma.sql`
        SELECT
          id,
          "brandName",
          "genericName",
          "companyName",
          strength,
          "dosageForm",
          price,
          "darNo",
          GREATEST(
            similarity("normalizedBrand", ${q}),
            similarity("normalizedGeneric", ${q}),
            similarity("searchText", ${q})
          ) AS score
        FROM medicines
        WHERE "isActive" = true
          AND ("tenantId" = ${tenantId} OR "tenantId" IS NULL)
          AND (
            "searchText" ILIKE ${like}
            OR "normalizedBrand" % ${q}
            OR "normalizedGeneric" % ${q}
            OR "searchText" % ${q}
          )
        ORDER BY
          CASE
            WHEN "normalizedBrand" = ${q} THEN 0
            WHEN "normalizedBrand" ILIKE ${`${q}%`} THEN 1
            WHEN "normalizedGeneric" ILIKE ${`${q}%`} THEN 2
            ELSE 3
          END,
          score DESC,
          "brandName" ASC
        LIMIT ${limit};
      `);
    } catch {
      return this.prisma.medicine.findMany({
        where: {
          isActive: true,
          OR: [{ tenantId }, { tenantId: null }],
          searchText: { contains: q, mode: "insensitive" }
        },
        orderBy: [{ brandName: "asc" }],
        take: limit
      });
    }
  }
}
