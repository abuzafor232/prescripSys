import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      include: { actor: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }
}
