import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePrescriptionTemplateDto } from "./dto/create-prescription-template.dto";
import { UpdatePrescriptionTemplateDto } from "./dto/update-prescription-template.dto";

@Injectable()
export class PrescriptionTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, doctorId: string) {
    return this.prisma.prescriptionTemplate.findMany({
      where: { tenantId, doctorId },
      orderBy: { updatedAt: "desc" },
    });
  }

  findOne(tenantId: string, doctorId: string, id: string) {
    return this.prisma.prescriptionTemplate.findFirst({
      where: { id, tenantId, doctorId },
    });
  }

  create(tenantId: string, doctorId: string, dto: CreatePrescriptionTemplateDto) {
    return this.prisma.prescriptionTemplate.create({
      data: {
        tenantId,
        doctorId,
        name: dto.name,
        description: dto.description ?? null,
        tags: dto.tags ?? [],
        data: dto.data as Prisma.InputJsonValue,
      },
    });
  }

  async update(tenantId: string, doctorId: string, id: string, dto: UpdatePrescriptionTemplateDto) {
    const template = await this.prisma.prescriptionTemplate.findFirst({ where: { id, tenantId, doctorId } });
    if (!template) throw new NotFoundException("Template not found");

    return this.prisma.prescriptionTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
      },
    });
  }

  async remove(tenantId: string, doctorId: string, id: string) {
    const template = await this.prisma.prescriptionTemplate.findFirst({ where: { id, tenantId, doctorId } });
    if (!template) throw new NotFoundException("Template not found");
    await this.prisma.prescriptionTemplate.delete({ where: { id } });
    return { success: true };
  }

  async recordUse(tenantId: string, doctorId: string, id: string) {
    const template = await this.prisma.prescriptionTemplate.findFirst({ where: { id, tenantId, doctorId } });
    if (!template) throw new NotFoundException("Template not found");
    return this.prisma.prescriptionTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
