import { IsOptional, IsString } from "class-validator";

export class CreateDoctorDto {
  @IsString()
  userId!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  bmdcNumber?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  qualifications?: string;
}
