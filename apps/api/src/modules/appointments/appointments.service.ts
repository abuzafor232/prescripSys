import { Injectable, NotFoundException } from "@nestjs/common";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentStatusDto } from "./dto/update-appointment-status.dto";

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, dto: PaginationDto & { date?: string; chamberId?: string }) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 50;
    const date = dto.date ? new Date(dto.date) : new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const where: Prisma.AppointmentWhereInput = {
      tenantId,
      scheduledAt: { gte: start, lt: end },
      ...(dto.chamberId ? { chamberId: dto.chamberId } : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        include: { patient: true, doctor: true, chamber: true },
        orderBy: [{ scheduledAt: "asc" }, { serialNo: "asc" }],
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.appointment.count({ where })
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async create(tenantId: string, dto: CreateAppointmentDto) {
    const scheduledAt = new Date(dto.scheduledAt);
    const start = new Date(
      scheduledAt.getFullYear(),
      scheduledAt.getMonth(),
      scheduledAt.getDate()
    );
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    return this.prisma.$transaction(async (tx) => {
      const chamber = await tx.chamber.findFirst({
        where: { id: dto.chamberId, tenantId, deletedAt: null }
      });
      if (!chamber) throw new NotFoundException("Chamber not found");

      const serialNo =
        (await tx.appointment.count({
          where: {
            tenantId,
            chamberId: dto.chamberId,
            scheduledAt: { gte: start, lt: end }
          }
        })) + 1;

      return tx.appointment.create({
        data: {
          tenantId,
          chamberId: dto.chamberId,
          doctorId: dto.doctorId,
          patientId: dto.patientId,
          scheduledAt,
          serialNo,
          token: `${chamber.serialPrefix || "S"}${String(serialNo).padStart(3, "0")}`,
          reason: dto.reason,
          notes: dto.notes
        },
        include: { patient: true, doctor: true, chamber: true }
      });
    });
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateAppointmentStatusDto) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId }
    });
    if (!appointment) throw new NotFoundException("Appointment not found");

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: dto.status,
        checkedInAt:
          dto.status === AppointmentStatus.IN_CONSULTATION
            ? new Date()
            : appointment.checkedInAt,
        completedAt:
          dto.status === AppointmentStatus.COMPLETED
            ? new Date()
            : appointment.completedAt,
        cancelledAt:
          dto.status === AppointmentStatus.CANCELLED
            ? new Date()
            : appointment.cancelledAt
      }
    });
  }
}
