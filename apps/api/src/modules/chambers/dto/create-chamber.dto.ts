import { IsOptional, IsString } from "class-validator";

export class CreateChamberDto {
  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  serialPrefix?: string;

  @IsOptional()
  @IsString()
  prescriptionFooter?: string;
}
