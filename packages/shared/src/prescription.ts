export const DOSE_PATTERNS = [
  "1+0+1",
  "1+1+1",
  "1+0+0",
  "0+0+1",
  "0+1+0",
  "1/2+0+1/2",
  "SOS",
  "STAT"
] as const;

export const MEAL_INSTRUCTIONS = [
  "After Meal",
  "Before Meal",
  "With Meal",
  "Empty Stomach",
  "At Bedtime"
] as const;

export type PrescriptionMedicineInput = {
  medicineId?: string;
  brandName: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  dose: string;
  duration: string;
  instruction?: string;
  note?: string;
  sortOrder: number;
};
