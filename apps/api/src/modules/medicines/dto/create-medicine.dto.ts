import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateMedicineDto {
  @IsString()
  @IsNotEmpty()
  brandName!: string;

  @IsString()
  @IsNotEmpty()
  genericName!: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  dosageForm?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  darNo?: string;
}
