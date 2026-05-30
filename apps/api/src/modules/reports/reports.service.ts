import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(tenantId: string) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const [patients, appointments, prescriptions, chambers, topMedicines] =
      await this.prisma.$transaction([
        this.prisma.patient.count({ where: { tenantId, deletedAt: null } }),
        this.prisma.appointment.count({
          where: { tenantId, scheduledAt: { gte: start } }
        }),
        this.prisma.prescription.count({
          where: { tenantId, createdAt: { gte: start } }
        }),
        this.prisma.chamber.count({ where: { tenantId, deletedAt: null } }),
        this.prisma.$queryRaw<Array<{ brandName: string; count: number }>>(Prisma.sql`
          SELECT "brandName", COUNT(*)::int AS count
          FROM prescription_items
          WHERE "tenantId" = ${tenantId}
          GROUP BY "brandName"
          ORDER BY count DESC
          LIMIT 10
        `)
      ]);

    return {
      patients,
      todaysAppointments: appointments,
      todaysPrescriptions: prescriptions,
      activeChambers: chambers,
      topMedicines: topMedicines.map((item) => ({
        brandName: item.brandName,
        count: item.count
      }))
    };
  }
}
