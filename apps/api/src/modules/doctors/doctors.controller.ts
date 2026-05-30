import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@bd-prescription/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import type { RequestUser } from "../../common/types/request-user";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateDoctorDto } from "./dto/create-doctor.dto";
import { DoctorsService } from "./doctors.service";

@ApiBearerAuth()
@ApiTags("doctors")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("doctors")
export class DoctorsController {
  constructor(private readonly doctors: DoctorsService) {}

  @Permissions(PERMISSIONS.PRESCRIPTIONS_READ)
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.doctors.list(user.tenantId);
  }

  @Permissions(PERMISSIONS.DOCTORS_MANAGE)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDoctorDto) {
    return this.doctors.create(user.tenantId, dto);
  }

  @Permissions(PERMISSIONS.PRESCRIPTIONS_READ)
  @Get(":id")
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.doctors.get(user.tenantId, id);
  }
}
