import { IsArray, IsIn, IsString } from "class-validator";

export const SECTION_TYPES = ["COMPLAINT", "INVESTIGATION", "DIAGNOSIS", "MEDICATION", "ADVICE"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export class CreatePrescriptionGroupDto {
  @IsString()
  @IsIn(SECTION_TYPES)
  sectionType!: SectionType;

  @IsString()
  name!: string;

  @IsArray()
  items!: unknown[];
}
