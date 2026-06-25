import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { PrescriptionsController } from "./prescriptions.controller";
import { PrescriptionsService } from "./prescriptions.service";

@Module({
  imports: [MailModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService]
})
export class PrescriptionsModule {}
