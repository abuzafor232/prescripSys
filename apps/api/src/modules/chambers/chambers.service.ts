import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateChamberDto } from "./dto/create-chamber.dto";

@Injectable()
export class ChambersService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.chamber.findMany({
      where: { tenantId, deletedAt: null },
      include: { doctors: { include: { doctor: true } }, assistants: true },
      orderBy: { name: "asc" }
    });
  }

  create(tenantId: string, dto: CreateChamberDto) {
    return this.prisma.chamber.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        serialPrefix: dto.serialPrefix ?? "",
        prescriptionFooter: dto.prescriptionFooter
      }
    });
  }

  async get(tenantId: string, id: string) {
    const chamber = await this.prisma.chamber.findFirst({
      where: { tenantId, id, deletedAt: null },
      include: { doctors: { include: { doctor: true } }, assistants: true }
    });
    if (!chamber) throw new NotFoundException("Chamber not found");
    return chamber;
  }
}
