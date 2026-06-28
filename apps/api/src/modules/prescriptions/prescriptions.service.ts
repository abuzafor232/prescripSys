import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { AppointmentStatus, Prisma, PrescriptionStatus } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import type { RequestUser } from "../../common/types/request-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePrescriptionDto } from "./dto/create-prescription.dto";
import { ListPrescriptionsDto } from "./dto/list-prescriptions.dto";
import { UpdatePrescriptionDto } from "./dto/update-prescription.dto";

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, dto: ListPrescriptionsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const and: Prisma.PrescriptionWhereInput[] = [{ tenantId }];

    if (dto.chamberId) and.push({ chamberId: dto.chamberId });

    if (dto.dateFrom || dto.dateTo) {
      and.push({
        createdAt: {
          ...(dto.dateFrom ? { gte: new Date(dto.dateFrom) } : {}),
          ...(dto.dateTo ? { lte: new Date(`${dto.dateTo}T23:59:59.999Z`) } : {})
        }
      });
    }

    // Global search across patient info, prescription content, diagnoses, medicines
    if (dto.q) {
      and.push({
        OR: [
          { prescriptionNo: { contains: dto.q, mode: "insensitive" } },
          { patient: { name: { contains: dto.q, mode: "insensitive" } } },
          { patient: { phone: { contains: dto.q, mode: "insensitive" } } },
          { chiefComplaints: { contains: dto.q, mode: "insensitive" } },
          { examination: { contains: dto.q, mode: "insensitive" } },
          { advice: { contains: dto.q, mode: "insensitive" } },
          { diagnoses: { some: { name: { contains: dto.q, mode: "insensitive" } } } },
          { medicines: { some: { brandName: { contains: dto.q, mode: "insensitive" } } } },
          { medicines: { some: { genericName: { contains: dto.q, mode: "insensitive" } } } }
        ]
      });
    }

    // Individual field filters
    if (dto.patientName) and.push({ patient: { name: { contains: dto.patientName, mode: "insensitive" } } });
    if (dto.phone)       and.push({ patient: { phone: { contains: dto.phone, mode: "insensitive" } } });
    if (dto.complaint)   and.push({ chiefComplaints: { contains: dto.complaint, mode: "insensitive" } });
    if (dto.diagnosis)   and.push({ diagnoses: { some: { name: { contains: dto.diagnosis, mode: "insensitive" } } } });
    if (dto.drug) {
      and.push({
        OR: [
          { medicines: { some: { brandName: { contains: dto.drug, mode: "insensitive" } } } },
          { medicines: { some: { genericName: { contains: dto.drug, mode: "insensitive" } } } }
        ]
      });
    }

    const where: Prisma.PrescriptionWhereInput = { AND: and };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.prescription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          patient: true,
          doctor: true,
          chamber: true,
          medicines:      { orderBy: { sortOrder: "asc" } },
          diagnoses:      { orderBy: { sortOrder: "asc" } },
          investigations: { orderBy: { sortOrder: "asc" } }
        }
      }),
      this.prisma.prescription.count({ where })
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async create(user: RequestUser, dto: CreatePrescriptionDto) {
    const doctorId = dto.doctorId ?? user.doctorId;
    if (!doctorId) {
      throw new BadRequestException("Doctor profile is required to create prescriptions");
    }

    const prescriptionNo = await this.nextPrescriptionNo(user.tenantId);
    const qrToken = randomBytes(24).toString("hex");

    return this.prisma.$transaction(async (tx) => {
      await this.ensurePrescriptionRelations(tx, user.tenantId, {
        patientId: dto.patientId,
        doctorId,
        chamberId: dto.chamberId,
        appointmentId: dto.appointmentId,
        medicineIds: dto.medicines
          .map((item) => item.medicineId)
          .filter((medicineId): medicineId is string => Boolean(medicineId))
      });

      const prescription = await tx.prescription.create({
        data: {
          tenantId: user.tenantId,
          patientId: dto.patientId,
          doctorId,
          chamberId: dto.chamberId,
          appointmentId: dto.appointmentId,
          createdByUserId: user.sub,
          prescriptionNo,
          qrToken,
          chiefComplaints: dto.chiefComplaints,
          examination: dto.examination,
          advice: dto.advice,
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
          metadata: dto.metadata ? toJson(dto.metadata) : undefined,
          medicines: {
            create: dto.medicines.map((item, index) => ({
              tenantId: user.tenantId,
              medicineId: item.medicineId,
              brandName: item.brandName,
              genericName: item.genericName,
              strength: item.strength,
              dosageForm: item.dosageForm,
              dose: item.dose,
              duration: item.duration,
              instruction: item.instruction,
              note: item.note,
              sortOrder: item.sortOrder ?? index
            }))
          },
          diagnoses: {
            create: dto.diagnoses.map((name, index) => ({
              tenantId: user.tenantId,
              name,
              sortOrder: index
            }))
          },
          investigations: {
            create: dto.investigations.map((name, index) => ({
              tenantId: user.tenantId,
              name,
              sortOrder: index
            }))
          }
        },
        include: prescriptionInclude
      });

      await tx.prescriptionVersion.create({
        data: {
          tenantId: user.tenantId,
          prescriptionId: prescription.id,
          version: 1,
          snapshot: toJson(prescription)
        }
      });

      if (dto.appointmentId) {
        await tx.appointment.updateMany({
          where: { id: dto.appointmentId, tenantId: user.tenantId },
          data: { status: AppointmentStatus.COMPLETED, completedAt: new Date() }
        });
      }

      return prescription;
    });
  }

  async get(tenantId: string, id: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, tenantId },
      include: prescriptionInclude
    });

    if (!prescription) throw new NotFoundException("Prescription not found");
    return prescription;
  }

  async update(user: RequestUser, id: string, dto: UpdatePrescriptionDto) {
    const existing = await this.get(user.tenantId, id);
    if (existing.status === PrescriptionStatus.SIGNED) {
      throw new BadRequestException("Signed prescriptions cannot be edited directly");
    }

    return this.prisma.$transaction(async (tx) => {
      await this.ensurePrescriptionRelations(tx, user.tenantId, {
        patientId: dto.patientId ?? existing.patientId,
        doctorId: dto.doctorId ?? existing.doctorId,
        chamberId: dto.chamberId ?? existing.chamberId,
        appointmentId: dto.appointmentId ?? existing.appointmentId ?? undefined,
        medicineIds: dto.medicines
          ?.map((item) => item.medicineId)
          .filter((medicineId): medicineId is string => Boolean(medicineId))
      });

      if (dto.medicines) {
        await tx.prescriptionItem.deleteMany({
          where: { tenantId: user.tenantId, prescriptionId: id }
        });
      }
      if (dto.diagnoses) {
        await tx.prescriptionDiagnosis.deleteMany({
          where: { tenantId: user.tenantId, prescriptionId: id }
        });
      }
      if (dto.investigations) {
        await tx.prescriptionInvestigation.deleteMany({
          where: { tenantId: user.tenantId, prescriptionId: id }
        });
      }

      const prescription = await tx.prescription.update({
        where: { id },
        data: {
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          chamberId: dto.chamberId,
          appointmentId: dto.appointmentId,
          chiefComplaints: dto.chiefComplaints,
          examination: dto.examination,
          advice: dto.advice,
          followUpDate:
            dto.followUpDate === undefined
              ? undefined
              : dto.followUpDate
                ? new Date(dto.followUpDate)
                : null,
          metadata: dto.metadata === undefined ? undefined : toJson(dto.metadata),
          currentVersion: { increment: 1 },
          medicines: dto.medicines
            ? {
                create: dto.medicines.map((item, index) => ({
                  tenantId: user.tenantId,
                  medicineId: item.medicineId,
                  brandName: item.brandName,
                  genericName: item.genericName,
                  strength: item.strength,
                  dosageForm: item.dosageForm,
                  dose: item.dose,
                  duration: item.duration,
                  instruction: item.instruction,
                  note: item.note,
                  sortOrder: item.sortOrder ?? index
                }))
              }
            : undefined,
          diagnoses: dto.diagnoses
            ? {
                create: dto.diagnoses.map((name, index) => ({
                  tenantId: user.tenantId,
                  name,
                  sortOrder: index
                }))
              }
            : undefined,
          investigations: dto.investigations
            ? {
                create: dto.investigations.map((name, index) => ({
                  tenantId: user.tenantId,
                  name,
                  sortOrder: index
                }))
              }
            : undefined
        },
        include: prescriptionInclude
      });

      await tx.prescriptionVersion.create({
        data: {
          tenantId: user.tenantId,
          prescriptionId: id,
          version: prescription.currentVersion,
          snapshot: toJson(prescription),
          changedById: user.sub
        }
      });

      return prescription;
    });
  }

  private async ensurePrescriptionRelations(
    tx: Prisma.TransactionClient,
    tenantId: string,
    input: {
      patientId?: string;
      doctorId?: string;
      chamberId?: string;
      appointmentId?: string;
      medicineIds?: string[];
    }
  ) {
    if (input.patientId) {
      const patient = await tx.patient.findFirst({
        where: { id: input.patientId, tenantId, deletedAt: null },
        select: { id: true }
      });
      if (!patient) throw new NotFoundException("Patient not found");
    }

    if (input.doctorId) {
      const doctor = await tx.doctor.findFirst({
        where: { id: input.doctorId, tenantId, deletedAt: null },
        select: { id: true }
      });
      if (!doctor) throw new NotFoundException("Doctor not found");
    }

    if (input.chamberId) {
      const chamber = await tx.chamber.findFirst({
        where: { id: input.chamberId, tenantId, deletedAt: null },
        select: { id: true }
      });
      if (!chamber) throw new NotFoundException("Chamber not found");
    }

    if (input.doctorId && input.chamberId) {
      const assignment = await tx.doctorChamber.findUnique({
        where: {
          doctorId_chamberId: {
            doctorId: input.doctorId,
            chamberId: input.chamberId
          }
        },
        select: { doctorId: true }
      });
      if (!assignment) {
        throw new BadRequestException("Doctor is not assigned to the selected chamber");
      }
    }

    if (input.appointmentId) {
      const appointment = await tx.appointment.findFirst({
        where: { id: input.appointmentId, tenantId },
        select: { patientId: true, doctorId: true, chamberId: true }
      });
      if (!appointment) throw new NotFoundException("Appointment not found");

      if (appointment.patientId && input.patientId && appointment.patientId !== input.patientId) {
        throw new BadRequestException("Appointment patient does not match prescription patient");
      }
      if (input.doctorId && appointment.doctorId !== input.doctorId) {
        throw new BadRequestException("Appointment doctor does not match prescription doctor");
      }
      if (input.chamberId && appointment.chamberId !== input.chamberId) {
        throw new BadRequestException("Appointment chamber does not match prescription chamber");
      }
    }

    const medicineIds = [...new Set(input.medicineIds ?? [])];
    if (medicineIds.length) {
      const medicineCount = await tx.medicine.count({
        where: {
          id: { in: medicineIds },
          OR: [{ tenantId }, { tenantId: null }]
        }
      });
      if (medicineCount !== medicineIds.length) {
        throw new NotFoundException("Medicine not found");
      }
    }
  }

  async sign(user: RequestUser, id: string) {
    await this.get(user.tenantId, id);
    return this.prisma.prescription.update({
      where: { id },
      data: { status: PrescriptionStatus.SIGNED, signedAt: new Date() },
      include: prescriptionInclude
    });
  }

  async verify(qrToken: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { qrToken },
      include: {
        patient: { select: { name: true } },
        doctor: { select: { displayName: true, bmdcNumber: true } },
        chamber: { select: { name: true, address: true } }
      }
    });

    if (!prescription) throw new NotFoundException("Prescription not found");
    return {
      valid: true,
      prescriptionNo: prescription.prescriptionNo,
      issuedAt: prescription.createdAt,
      patient: prescription.patient.name,
      doctor: prescription.doctor,
      chamber: prescription.chamber,
      status: prescription.status
    };
  }

  private async nextPrescriptionNo(tenantId: string) {
    const today = new Date();
    const stamp = today.toISOString().slice(2, 10).replace(/-/g, "");
    const count = await this.prisma.prescription.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate())
        }
      }
    });
    return `RX-${stamp}-${String(count + 1).padStart(4, "0")}`;
  }
}

const prescriptionInclude = {
  patient: true,
  doctor: true,
  chamber: true,
  medicines: { orderBy: { sortOrder: "asc" as const } },
  diagnoses: { orderBy: { sortOrder: "asc" as const } },
  investigations: { orderBy: { sortOrder: "asc" as const } }
};

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
