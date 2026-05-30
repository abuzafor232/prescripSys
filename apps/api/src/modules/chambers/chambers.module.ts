import { Module } from "@nestjs/common";
import { ChambersController } from "./chambers.controller";
import { ChambersService } from "./chambers.service";

@Module({
  controllers: [ChambersController],
  providers: [ChambersService],
  exports: [ChambersService]
})
export class ChambersModule {}
