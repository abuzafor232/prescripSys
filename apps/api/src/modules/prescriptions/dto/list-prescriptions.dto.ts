import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class ListPrescriptionsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  drug?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  complaint?: string;

  @IsOptional()
  @IsString()
  patientName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  registrationNo?: string;

  @IsOptional()
  @IsString()
  investigation?: string;

  @IsOptional()
  @IsString()
  advice?: string;

  @IsOptional()
  @IsString()
  referral?: string;
}
