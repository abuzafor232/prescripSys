import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@bd-prescription/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import type { RequestUser } from "../../common/types/request-user";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiBearerAuth()
@ApiTags("billing")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("billing")
export class BillingController {
  @Permissions(PERMISSIONS.BILLING_MANAGE)
  @Get("summary")
  summary(@CurrentUser() user: RequestUser) {
    return {
      tenantId: user.tenantId,
      providerReady: ["sslcommerz", "bkash", "nagad"],
      status: "billing-module-ready"
    };
  }
}
