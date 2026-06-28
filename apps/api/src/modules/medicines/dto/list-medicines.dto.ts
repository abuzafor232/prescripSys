import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListMedicinesDto {
  @IsOptional()
  @IsString()
  q?: string;

  /** "trade" → search brandName only · "generic" → search genericName only · omit → both */
  @IsOptional()
  @IsIn(["trade", "generic"])
  searchType?: "trade" | "generic";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
