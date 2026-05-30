import { IsOptional, IsString } from "class-validator";

export class ImportMedicinesDto {
  @IsString()
  filePath!: string;

  @IsOptional()
  @IsString()
  source = "dgda-csv";
}
