import { IsArray, IsOptional, IsString } from "class-validator";

export class UpdatePrescriptionGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  items?: unknown[];
}
