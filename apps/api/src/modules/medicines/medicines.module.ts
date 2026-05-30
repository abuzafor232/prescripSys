import { Module } from "@nestjs/common";
import { MedicineImportService } from "./medicine-import.service";
import { MedicineRepository } from "./medicine.repository";
import { MedicinesController } from "./medicines.controller";
import { MedicinesService } from "./medicines.service";

@Module({
  controllers: [MedicinesController],
  providers: [MedicinesService, MedicineRepository, MedicineImportService],
  exports: [MedicinesService, MedicineImportService]
})
export class MedicinesModule {}
