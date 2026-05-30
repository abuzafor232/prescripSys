import { Body, Controller, Get, Param, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@bd-prescription/shared";
import { Prisma } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import type { RequestUser } from "../../common/types/request-user";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SettingsService } from "./settings.service";

@ApiBearerAuth()
@ApiTags("settings")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @Get()
  list(@CurrentUser() user: RequestUser, @Query("scope") scope?: string) {
    return this.settings.list(user.tenantId, scope);
  }

  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @Put(":scope/:key")
  upsert(
    @CurrentUser() user: RequestUser,
    @Param("scope") scope: string,
    @Param("key") key: string,
    @Body("value") value: unknown
  ) {
    return this.settings.upsert(user.tenantId, scope, key, value as Prisma.InputJsonValue);
  }
}
