import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { AuditLogsModule } from "./modules/audit-logs/audit-logs.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { BillingModule } from "./modules/billing/billing.module";
import { ChambersModule } from "./modules/chambers/chambers.module";
import { DoctorsModule } from "./modules/doctors/doctors.module";
import { MedicinesModule } from "./modules/medicines/medicines.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { PrescriptionsModule } from "./modules/prescriptions/prescriptions.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { RedisModule } from "./modules/redis/redis.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { PrescriptionGroupsModule } from "./modules/prescription-groups/prescription-groups.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"]
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    DoctorsModule,
    ChambersModule,
    PatientsModule,
    MedicinesModule,
    PrescriptionsModule,
    PrescriptionGroupsModule,
    AppointmentsModule,
    BillingModule,
    NotificationsModule,
    ReportsModule,
    AuditLogsModule,
    SettingsModule
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
