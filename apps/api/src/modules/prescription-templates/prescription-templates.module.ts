import { Module } from "@nestjs/common";
import { PrescriptionTemplatesController } from "./prescription-templates.controller";
import { PrescriptionTemplatesService } from "./prescription-templates.service";

@Module({
  controllers: [PrescriptionTemplatesController],
  providers: [PrescriptionTemplatesService],
  exports: [PrescriptionTemplatesService],
})
export class PrescriptionTemplatesModule {}
