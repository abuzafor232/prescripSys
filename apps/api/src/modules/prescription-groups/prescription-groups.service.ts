import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePrescriptionGroupDto } from "./dto/create-prescription-group.dto";
import { UpdatePrescriptionGroupDto } from "./dto/update-prescription-group.dto";

@Injectable()
export class PrescriptionGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, doctorId: string, sectionType?: string) {
    return this.prisma.prescriptionGroup.findMany({
      where: {
        tenantId,
        doctorId,
        ...(sectionType ? { sectionType } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(tenantId: string, doctorId: string, dto: CreatePrescriptionGroupDto) {
    const existing = await this.prisma.prescriptionGroup.findFirst({
      where: { tenantId, doctorId, sectionType: dto.sectionType, name: dto.name },
    });
    if (existing) throw new ConflictException(`A group named "${dto.name}" already exists in this section`);

    return this.prisma.prescriptionGroup.create({
      data: {
        tenantId,
        doctorId,
        sectionType: dto.sectionType,
        name: dto.name,
        items: dto.items as Prisma.InputJsonArray,
      },
    });
  }

  async update(tenantId: string, doctorId: string, id: string, dto: UpdatePrescriptionGroupDto) {
    const group = await this.prisma.prescriptionGroup.findFirst({ where: { id, tenantId, doctorId } });
    if (!group) throw new NotFoundException("Group not found");

    if (dto.name && dto.name !== group.name) {
      const conflict = await this.prisma.prescriptionGroup.findFirst({
        where: { tenantId, doctorId, sectionType: group.sectionType, name: dto.name, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`A group named "${dto.name}" already exists in this section`);
    }

    return this.prisma.prescriptionGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.items !== undefined ? { items: dto.items as Prisma.InputJsonArray } : {}),
      },
    });
  }

  async remove(tenantId: string, doctorId: string, id: string) {
    const group = await this.prisma.prescriptionGroup.findFirst({ where: { id, tenantId, doctorId } });
    if (!group) throw new NotFoundException("Group not found");
    await this.prisma.prescriptionGroup.delete({ where: { id } });
    return { success: true };
  }
}
