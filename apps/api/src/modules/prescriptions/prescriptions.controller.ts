import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { MailService } from "../mail/mail.service";
import { CreatePrescriptionDto } from "./dto/create-prescription.dto";
import { SendPrescriptionEmailDto } from "./dto/send-email.dto";
import { UpdatePrescriptionDto } from "./dto/update-prescription.dto";
import { PrescriptionsService } from "./prescriptions.service";

@ApiTags("prescriptions")
@Controller("prescriptions")
export class PrescriptionsController {
  constructor(
    private readonly prescriptions: PrescriptionsService,
    private readonly mail: MailService
  ) {}

  @Get("verify/:token")
  verify(@Param("token") token: string) {
    return this.prescriptions.verify(token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.PRESCRIPTIONS_READ)
  @Get()
  list(@CurrentUser() user: RequestUser, @Query() dto: PaginationDto) {
    return this.prescriptions.list(user.tenantId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.PRESCRIPTIONS_WRITE)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePrescriptionDto) {
    return this.prescriptions.create(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.PRESCRIPTIONS_READ)
  @Get(":id")
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.prescriptions.get(user.tenantId, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.PRESCRIPTIONS_WRITE)
  @Patch(":id")
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdatePrescriptionDto
  ) {
    return this.prescriptions.update(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.PRESCRIPTIONS_WRITE)
  @Post(":id/sign")
  sign(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.prescriptions.sign(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.PRESCRIPTIONS_READ)
  @HttpCode(HttpStatus.OK)
  @Post("send-email")
  async sendEmail(@Body() dto: SendPrescriptionEmailDto) {
    await this.mail.sendPrescriptionEmail(dto);
    return { ok: true };
  }
}
