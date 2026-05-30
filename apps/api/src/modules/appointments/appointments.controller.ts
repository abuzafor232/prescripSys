import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@bd-prescription/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import type { RequestUser } from "../../common/types/request-user";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AppointmentsService } from "./appointments.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentStatusDto } from "./dto/update-appointment-status.dto";

@ApiBearerAuth()
@ApiTags("appointments")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Permissions(PERMISSIONS.APPOINTMENTS_MANAGE)
  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query() dto: PaginationDto & { date?: string; chamberId?: string }
  ) {
    return this.appointments.list(user.tenantId, dto);
  }

  @Permissions(PERMISSIONS.APPOINTMENTS_MANAGE)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(user.tenantId, dto);
  }

  @Permissions(PERMISSIONS.APPOINTMENTS_MANAGE)
  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateAppointmentStatusDto
  ) {
    return this.appointments.updateStatus(user.tenantId, id, dto);
  }
}
