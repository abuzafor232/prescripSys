import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class SendPrescriptionEmailDto {
  @IsEmail()
  to!: string;

  @IsString() @IsNotEmpty()
  patientName!: string;

  @IsString() @IsNotEmpty()
  prescriptionNo!: string;

  @IsString() @IsNotEmpty()
  doctorName!: string;

  @IsString() @IsNotEmpty()
  pdfBase64!: string;

  @IsString() @IsNotEmpty()
  filename!: string;
}
