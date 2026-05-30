import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateAppointmentDto {
  @IsString()
  chamberId!: string;

  @IsString()
  doctorId!: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
