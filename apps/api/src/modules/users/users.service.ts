import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        status: true,
        lastLoginAt: true,
        roles: { include: { role: true } },
        doctor: true
      },
      orderBy: { fullName: "asc" }
    });
  }
}
