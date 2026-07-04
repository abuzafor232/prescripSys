import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@bd-prescription/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import type { RequestUser } from "../../common/types/request-user";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreatePrescriptionTemplateDto } from "./dto/create-prescription-template.dto";
import { UpdatePrescriptionTemplateDto } from "./dto/update-prescription-template.dto";
import { PrescriptionTemplatesService } from "./prescription-templates.service";

@ApiBearerAuth()
@ApiTags("prescription-templates")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("prescription-templates")
export class PrescriptionTemplatesController {
  constructor(private readonly templates: PrescriptionTemplatesService) {}

  @Permissions(PERMISSIONS.PRESCRIPTIONS_READ)
  @Get()
  list(@CurrentUser() user: RequestUser) {
    if (!user.doctorId) throw new BadRequestException("Doctor profile required");
    return this.templates.list(user.tenantId, user.doctorId);
  }

  @Permissions(PERMISSIONS.PRESCRIPTIONS_WRITE)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePrescriptionTemplateDto) {
    if (!user.doctorId) throw new BadRequestException("Doctor profile required");
    return this.templates.create(user.tenantId, user.doctorId, dto);
  }

  @Permissions(PERMISSIONS.PRESCRIPTIONS_READ)
  @Get(":id")
  findOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    if (!user.doctorId) throw new BadRequestException("Doctor profile required");
    return this.templates.findOne(user.tenantId, user.doctorId, id);
  }

  @Permissions(PERMISSIONS.PRESCRIPTIONS_WRITE)
  @Patch(":id")
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdatePrescriptionTemplateDto,
  ) {
    if (!user.doctorId) throw new BadRequestException("Doctor profile required");
    return this.templates.update(user.tenantId, user.doctorId, id, dto);
  }

  @Permissions(PERMISSIONS.PRESCRIPTIONS_WRITE)
  @Delete(":id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    if (!user.doctorId) throw new BadRequestException("Doctor profile required");
    return this.templates.remove(user.tenantId, user.doctorId, id);
  }

  @Permissions(PERMISSIONS.PRESCRIPTIONS_WRITE)
  @Post(":id/use")
  recordUse(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    if (!user.doctorId) throw new BadRequestException("Doctor profile required");
    return this.templates.recordUse(user.tenantId, user.doctorId, id);
  }
}
