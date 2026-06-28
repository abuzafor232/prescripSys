import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@bd-prescription/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import type { RequestUser } from "../../common/types/request-user";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateMedicineDto } from "./dto/create-medicine.dto";
import { ImportMedicinesDto } from "./dto/import-medicines.dto";
import { ListMedicinesDto } from "./dto/list-medicines.dto";
import { SearchMedicinesDto } from "./dto/search-medicines.dto";
import { MedicinesService } from "./medicines.service";

@ApiBearerAuth()
@ApiTags("medicines")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("medicines")
export class MedicinesController {
  constructor(private readonly medicines: MedicinesService) {}

  @Permissions(PERMISSIONS.PRESCRIPTIONS_READ)
  @Get()
  list(@Query() dto: ListMedicinesDto) {
    return this.medicines.list(dto);
  }

  @Permissions(PERMISSIONS.PRESCRIPTIONS_READ)
  @Get("dosage-forms")
  dosageForms() {
    return this.medicines.dosageForms();
  }

  @Permissions(PERMISSIONS.PRESCRIPTIONS_WRITE)
  @Get("search")
  search(@CurrentUser() user: RequestUser, @Query() dto: SearchMedicinesDto) {
    return this.medicines.search(user.tenantId, dto);
  }

  @Permissions(PERMISSIONS.MEDICINES_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(@Body() dto: CreateMedicineDto) {
    return this.medicines.create(dto);
  }

  @Permissions(PERMISSIONS.MEDICINES_MANAGE)
  @Post("import")
  import(@CurrentUser() user: RequestUser, @Body() dto: ImportMedicinesDto) {
    return this.medicines.importCsv(dto.filePath, dto.source, user.tenantId);
  }
}
