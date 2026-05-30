import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeSearchText } from "../../common/utils/search-normalizer";

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

@Injectable()
export class MedicineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(tenantId: string, query: string, limit: number) {
    const q = normalizeSearchText(query);
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
