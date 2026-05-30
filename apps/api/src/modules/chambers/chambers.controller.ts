import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@bd-prescription/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import type { RequestUser } from "../../common/types/request-user";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ChambersService } from "./chambers.service";
import { CreateChamberDto } from "./dto/create-chamber.dto";

@ApiBearerAuth()
@ApiTags("chambers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("chambers")
export class ChambersController {
  constructor(private readonly chambers: ChambersService) {}

  @Permissions(PERMISSIONS.PRESCRIPTIONS_READ)
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.chambers.list(user.tenantId);
  }

  @Permissions(PERMISSIONS.CHAMBERS_MANAGE)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateChamberDto) {
    return this.chambers.create(user.tenantId, dto);
  }

  @Permissions(PERMISSIONS.PRESCRIPTIONS_READ)
  @Get(":id")
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.chambers.get(user.tenantId, id);
  }
}
