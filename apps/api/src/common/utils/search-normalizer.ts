export function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

export function buildMedicineSearchText(input: {
  brandName: string;
  genericName?: string | null;
  companyName?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  banglaName?: string | null;
}) {
  return normalizeSearchText(
    [
      input.brandName,
      input.genericName,
      input.companyName,
      input.dosageForm,
      input.strength,
      input.banglaName
    ].filter(Boolean).join(" ")
  );
}
