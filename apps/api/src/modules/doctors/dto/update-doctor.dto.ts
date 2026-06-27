import { IsOptional, IsString } from "class-validator";

export class UpdateDoctorDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() bmdcNumber?: string;
  @IsOptional() @IsString() specialization?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() qualifications?: string;
  @IsOptional() @IsString() profileImageUrl?: string;
}
