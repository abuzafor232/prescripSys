import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { normalizeSearchText } from "../../common/utils/search-normalizer";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, dto: PaginationDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const q = normalizeSearchText(dto.q);
    const where: Prisma.PatientWhereInput = {
      tenantId,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { searchText: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { registrationNo: { contains: q, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(dto.dateFrom || dto.dateTo
        ? {
            createdAt: {
              ...(dto.dateFrom ? { gte: new Date(`${dto.dateFrom}T00:00:00.000Z`) } : {}),
              ...(dto.dateTo   ? { lte: new Date(`${dto.dateTo}T23:59:59.999Z`)   } : {})
            }
          }
        : {})
    };

    const [rawData, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          prescriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true }
          }
        }
      }),
      this.prisma.patient.count({ where })
    ]);

    const data = rawData.map(({ prescriptions, ...p }) => ({
      ...p,
      lastVisitAt: prescriptions[0]?.createdAt ?? null
    }));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async create(tenantId: string, userId: string, dto: CreatePatientDto) {
    const registrationNo = await this.nextRegistrationNo(tenantId);
    return this.prisma.patient.create({
      data: {
        ...dto,
        tenantId,
        createdByUserId: userId,
        registrationNo,
        searchText: this.buildSearchText(dto.name, dto.phone, registrationNo)
      }
    });
  }

  async get(tenantId: string, id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        prescriptions: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            doctor: { select: { displayName: true } },
            chamber: { select: { name: true } },
            medicines: { orderBy: { sortOrder: "asc" } }
          }
        },
        appointments: {
          orderBy: { scheduledAt: "desc" },
          take: 10
        }
      }
    });

    if (!patient) throw new NotFoundException("Patient not found");
    return patient;
  }

  async update(tenantId: string, id: string, dto: UpdatePatientDto) {
    const existing = await this.get(tenantId, id);
    return this.prisma.patient.update({
      where: { id: existing.id },
      data: {
        ...dto,
        searchText: this.buildSearchText(
          dto.name ?? existing.name,
          dto.phone ?? existing.phone ?? undefined,
          existing.registrationNo ?? undefined
        )
      }
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.get(tenantId, id);
    return this.prisma.patient.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() }
    });
  }

  private buildSearchText(name: string, phone?: string, registrationNo?: string) {
    return normalizeSearchText([name, phone, registrationNo].filter(Boolean).join(" "));
  }

  private async nextRegistrationNo(tenantId: string) {
    const count = await this.prisma.patient.count({ where: { tenantId } });
    return `P-${String(count + 1).padStart(6, "0")}`;
  }
}
