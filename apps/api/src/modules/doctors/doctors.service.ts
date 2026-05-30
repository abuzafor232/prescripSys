import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDoctorDto } from "./dto/create-doctor.dto";

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.doctor.findMany({
      where: { tenantId, deletedAt: null },
      include: { chambers: { include: { chamber: true } } },
      orderBy: { displayName: "asc" }
    });
  }

  create(tenantId: string, dto: CreateDoctorDto) {
    return this.prisma.doctor.create({
      data: {
        tenantId,
        userId: dto.userId,
        displayName: dto.displayName,
        bmdcNumber: dto.bmdcNumber,
        specialization: dto.specialization,
        designation: dto.designation,
        qualifications: dto.qualifications
      }
    });
  }

  async get(tenantId: string, id: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { tenantId, id, deletedAt: null },
      include: { chambers: { include: { chamber: true } }, templates: true }
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    return doctor;
  }

  assignChamber(tenantId: string, doctorId: string, chamberId: string) {
    return this.prisma.doctorChamber.create({
      data: { doctorId, chamberId },
      include: { doctor: true, chamber: true }
    });
  }
}
