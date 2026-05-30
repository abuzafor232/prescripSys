import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, scope = "tenant") {
    return this.prisma.setting.findMany({
      where: { tenantId, scope },
      orderBy: { key: "asc" }
    });
  }

  upsert(tenantId: string, scope: string, key: string, value: Prisma.InputJsonValue) {
    return this.prisma.setting.upsert({
      where: { tenantId_scope_key: { tenantId, scope, key } },
      create: { tenantId, scope, key, value },
      update: { value }
    });
  }
}
