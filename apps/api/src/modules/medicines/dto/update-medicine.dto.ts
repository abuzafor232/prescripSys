import { IsOptional, IsString, IsNotEmpty } from "class-validator";

export class UpdateMedicineDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  brandName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  genericName?: string;

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
