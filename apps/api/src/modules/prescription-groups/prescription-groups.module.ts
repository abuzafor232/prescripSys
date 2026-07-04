import { Module } from "@nestjs/common";
import { PrescriptionGroupsController } from "./prescription-groups.controller";
import { PrescriptionGroupsService } from "./prescription-groups.service";

@Module({
  controllers: [PrescriptionGroupsController],
  providers: [PrescriptionGroupsService],
  exports: [PrescriptionGroupsService],
})
export class PrescriptionGroupsModule {}
