import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@bd-prescription/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import type { RequestUser } from "../../common/types/request-user";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";
import { PatientsService } from "./patients.service";

@ApiBearerAuth()
@ApiTags("patients")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("patients")
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Permissions(PERMISSIONS.PATIENTS_READ)
  @Get()
  list(@CurrentUser() user: RequestUser, @Query() dto: PaginationDto) {
    return this.patients.list(user.tenantId, dto);
  }

  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePatientDto) {
    return this.patients.create(user.tenantId, user.sub, dto);
  }

  @Permissions(PERMISSIONS.PATIENTS_READ)
  @Get(":id")
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.patients.get(user.tenantId, id);
  }

  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  @Patch(":id")
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdatePatientDto
  ) {
    return this.patients.update(user.tenantId, id, dto);
  }

  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  @Delete(":id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.patients.remove(user.tenantId, id);
  }
}
