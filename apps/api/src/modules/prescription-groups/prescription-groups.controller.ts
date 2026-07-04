import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@bd-prescription/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import type { RequestUser } from "../../common/types/request-user";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreatePrescriptionGroupDto } from "./dto/create-prescription-group.dto";
import { UpdatePrescriptionGroupDto } from "./dto/update-prescription-group.dto";
import { PrescriptionGroupsService } from "./prescription-groups.service";

@ApiBearerAuth()
@ApiTags("prescription-groups")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("prescription-groups")
export class PrescriptionGroupsController {
  constructor(private readonly groups: PrescriptionGroupsService) {}

  @Permissions(PERMISSIONS.PRESCRIPTIONS_READ)
  @Get()
  list(@CurrentUser() user: RequestUser, @Query("section") section?: string) {
    if (!user.doctorId) throw new BadRequestException("Doctor profile required");
    return this.groups.list(user.tenantId, user.doctorId, section);
  }

  @Permissions(PERMISSIONS.PRESCRIPTIONS_WRITE)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePrescriptionGroupDto) {
    if (!user.doctorId) throw new BadRequestException("Doctor profile required");
    return this.groups.create(user.tenantId, user.doctorId, dto);
  }

  @Permissions(PERMISSIONS.PRESCRIPTIONS_WRITE)
  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdatePrescriptionGroupDto) {
    if (!user.doctorId) throw new BadRequestException("Doctor profile required");
    return this.groups.update(user.tenantId, user.doctorId, id, dto);
  }

  @Permissions(PERMISSIONS.PRESCRIPTIONS_WRITE)
  @Delete(":id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    if (!user.doctorId) throw new BadRequestException("Doctor profile required");
    return this.groups.remove(user.tenantId, user.doctorId, id);
  }
}
