import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@bd-prescription/shared";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiBearerAuth()
@ApiTags("notifications")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("notifications")
export class NotificationsController {
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @Get("providers")
  providers() {
    return {
      sms: ["disabled", "sslwireless", "robi", "custom-http"],
      email: ["smtp", "ses"],
      status: "notification-module-ready"
    };
  }
}
