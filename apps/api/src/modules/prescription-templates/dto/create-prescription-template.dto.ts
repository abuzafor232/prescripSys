import { IsArray, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreatePrescriptionTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsArray()
  data!: unknown;
}
