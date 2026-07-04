const LOCAL_API_URL = "http://localhost:4000/api/v1";
const RENDER_API_URL = "https://prescripsys.onrender.com/api/v1";

function getApiUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl;

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    if (!isLocalhost) return RENDER_API_URL;
  }

  return LOCAL_API_URL;
}

export type ApiError = {
  statusCode: number;
  path?: string;
  method?: string;
  timestamp?: string;
  error?: unknown;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  const response = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    let error: ApiError = { statusCode: response.status };
    try {
      error = (await response.json()) as ApiError;
    } catch {
      error = { statusCode: response.status, error: response.statusText };
    }
    throw error;
  }

  return response.json() as Promise<T>;
}

export function getApiErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) return "Something went wrong. Please try again.";
  const e = error as Record<string, unknown>;

  // Nested error object: { error: { message: [...] } }
  if (typeof e.error === "object" && e.error !== null) {
    const body = e.error as Record<string, unknown>;
    const msg = body.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string") return msg;
  }

  // NestJS class-validator standard: { statusCode, message: [...], error: "Bad Request" }
  if ("message" in e) {
    const msg = e.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string") return msg;
  }

  // Simple string error
  if (typeof e.error === "string") return e.error;

  return "Something went wrong. Please try again.";
}

export type AuthUser = {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  doctorId?: string;
  roles: string[];
  permissions: string[];
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type RefreshResponse = {
  accessToken: string;
};

export function loginWithPassword(email: string, password: string) {
  return apiFetch<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function refreshAccessToken(refreshToken: string) {
  return apiFetch<RefreshResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken })
  });
}

export function logoutSession(refreshToken: string) {
  return apiFetch<{ ok: true }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken })
  });
}

export function fetchCurrentUser(token: string) {
  return apiFetch<AuthUser>("/auth/me", { token });
}

export type PatientGender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";

export type Patient = {
  id: string;
  tenantId: string;
  chamberId?: string | null;
  registrationNo?: string | null;
  name: string;
  phone?: string | null;
  gender: PatientGender;
  dateOfBirth?: string | null;
  ageYears?: number | null;
  ageMonths?: number | null;
  ageDays?: number | null;
  bloodGroup?: string | null;
  address?: string | null;
  allergies?: string | null;
  chronicDiseaseHistory?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastVisitAt?: string | null;
};

export type ProfilePrescription = {
  id: string;
  prescriptionNo: string;
  createdAt: string;
  status: "DRAFT" | "SIGNED" | "CANCELLED";
  chiefComplaints?: string | null;
  examination?: string | null;
  advice?: string | null;
  followUpDate?: string | null;
  doctor: { displayName: string };
  chamber: { name: string };
  medicines: Array<{
    id: string;
    brandName: string;
    genericName?: string | null;
    strength?: string | null;
    dosageForm?: string | null;
    dose: string;
    duration: string;
    instruction?: string | null;
    note?: string | null;
  }>;
};

export type PatientProfile = Patient & {
  prescriptions: ProfilePrescription[];
};

export type PatientListResponse = {
  data: Patient[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreatePatientInput = {
  name: string;
  phone?: string;
  gender?: PatientGender;
  dateOfBirth?: string;
  ageYears?: number;
  ageMonths?: number;
  ageDays?: number;
  bloodGroup?: string;
  address?: string;
  allergies?: string;
  chronicDiseaseHistory?: string;
};

export function searchPatients(q: string, token: string) {
  return apiFetch<PatientListResponse>(
    `/patients?q=${encodeURIComponent(q)}&limit=8`,
    { token }
  );
}

export function fetchPatients(
  params: { q?: string; page?: number; limit?: number; dateFrom?: string; dateTo?: string; chamberId?: string },
  token: string
) {
  const qs = new URLSearchParams();
  if (params.q)          qs.set("q",          params.q);
  if (params.page)       qs.set("page",       String(params.page));
  if (params.limit)      qs.set("limit",      String(params.limit));
  if (params.dateFrom)   qs.set("dateFrom",   params.dateFrom);
  if (params.dateTo)     qs.set("dateTo",     params.dateTo);
  if (params.chamberId)  qs.set("chamberId",  params.chamberId);
  return apiFetch<PatientListResponse>(`/patients?${qs.toString()}`, { token });
}

export function fetchPatientProfile(id: string, token: string) {
  return apiFetch<PatientProfile>(`/patients/${id}`, { token });
}

export function createPatient(input: CreatePatientInput, token: string) {
  return apiFetch<Patient>("/patients", {
    method: "POST",
    token,
    body: JSON.stringify(input)
  });
}

export function updatePatient(id: string, input: Partial<CreatePatientInput>, token: string) {
  return apiFetch<Patient>(`/patients/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input)
  });
}

export type MedicineSearchResult = {
  id: string;
  brandName: string;
  genericName: string;
  companyName?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  darNo?: string | null;
};

export type Chamber = {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  phone?: string | null;
  email?: string | null;
  serialPrefix?: string | null;
  prescriptionFooter?: string | null;
  doctors?: Array<{
    isDefault: boolean;
    doctor: {
      id: string;
      displayName: string;
      bmdcNumber?: string | null;
      specialization?: string | null;
      designation?: string | null;
    };
  }>;
};

export type Doctor = {
  id: string;
  tenantId: string;
  userId: string;
  displayName: string;
  bmdcNumber?: string | null;
  specialization?: string | null;
  designation?: string | null;
  qualifications?: string | null;
  profileImageUrl?: string | null;
  chambers?: Array<{
    isDefault: boolean;
    chamber: Chamber;
  }>;
};

export type PrescriptionMedicineInput = {
  medicineId?: string;
  brandName: string;
  genericName?: string;
  strength?: string | null;
  dosageForm?: string | null;
  dose: string;
  duration: string;
  instruction?: string;
  note?: string;
  sortOrder?: number;
};

export type CreatePrescriptionInput = {
  patientId: string;
  doctorId?: string;
  chamberId: string;
  appointmentId?: string;
  chiefComplaints?: string;
  examination?: string;
  diagnoses?: string[];
  investigations?: string[];
  medicines: PrescriptionMedicineInput[];
  advice?: string;
  followUpDate?: string;
  metadata?: Record<string, unknown>;
};

export type Prescription = {
  id: string;
  tenantId: string;
  patientId: string;
  doctorId: string;
  chamberId: string;
  appointmentId?: string | null;
  prescriptionNo: string;
  createdAt?: string;
  status: "DRAFT" | "SIGNED" | "CANCELLED";
  chiefComplaints?: string | null;
  examination?: string | null;
  advice?: string | null;
  followUpDate?: string | null;
  metadata?: Record<string, unknown>;
  patient: Patient;
  doctor: Doctor;
  chamber: Chamber;
  medicines: PrescriptionMedicineInput[];
  diagnoses: Array<{ id: string; name: string; note?: string | null; sortOrder: number }>;
  investigations: Array<{ id: string; name: string; note?: string | null; sortOrder: number }>;
};

export type PrescriptionListResponse = {
  data: Prescription[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export function fetchPrescriptions(
  params: {
    q?: string;
    patientName?: string;
    phone?: string;
    registrationNo?: string;
    drug?: string;
    diagnosis?: string;
    complaint?: string;
    investigation?: string;
    advice?: string;
    referral?: string;
    dateFrom?: string;
    dateTo?: string;
    chamberId?: string;
    page?: number;
    limit?: number;
  },
  token: string
) {
  const qs = new URLSearchParams();
  if (params.q)             qs.set("q",             params.q);
  if (params.patientName)   qs.set("patientName",   params.patientName);
  if (params.phone)         qs.set("phone",         params.phone);
  if (params.registrationNo) qs.set("registrationNo", params.registrationNo);
  if (params.drug)          qs.set("drug",          params.drug);
  if (params.diagnosis)     qs.set("diagnosis",     params.diagnosis);
  if (params.complaint)     qs.set("complaint",     params.complaint);
  if (params.investigation) qs.set("investigation", params.investigation);
  if (params.advice)        qs.set("advice",        params.advice);
  if (params.referral)      qs.set("referral",      params.referral);
  if (params.dateFrom)      qs.set("dateFrom",      params.dateFrom);
  if (params.dateTo)        qs.set("dateTo",        params.dateTo);
  if (params.chamberId)     qs.set("chamberId",     params.chamberId);
  if (params.page)          qs.set("page",          String(params.page));
  if (params.limit)         qs.set("limit",         String(params.limit));
  return apiFetch<PrescriptionListResponse>(`/prescriptions?${qs.toString()}`, { token });
}

export type MedicineListItem = {
  id: string;
  brandName: string;
  genericName: string;
  strength: string | null;
  companyName: string | null;
  dosageForm: string | null;
  darNo: string | null;
};

export type MedicineListResponse = {
  data: MedicineListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type CreateMedicineInput = {
  brandName: string;
  genericName: string;
  strength?: string;
  dosageForm?: string;
  companyName?: string;
  darNo?: string;
};

export function createMedicine(input: CreateMedicineInput, token: string) {
  return apiFetch<MedicineListItem>("/medicines", {
    method: "POST",
    token,
    body: JSON.stringify(input)
  });
}

export function deleteMedicine(id: string, token: string) {
  return apiFetch<{ id: string }>(`/medicines/${id}`, { method: "DELETE", token });
}

export function updateMedicine(id: string, input: Partial<CreateMedicineInput>, token: string) {
  return apiFetch<MedicineListItem>(`/medicines/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input)
  });
}

export function fetchMedicineList(
  params: { q?: string; searchType?: "trade" | "generic"; page?: number; limit?: number },
  token: string
) {
  const qs = new URLSearchParams();
  if (params.q)          qs.set("q",          params.q);
  if (params.searchType) qs.set("searchType", params.searchType);
  if (params.page)       qs.set("page",       String(params.page));
  if (params.limit)      qs.set("limit",      String(params.limit));
  return apiFetch<MedicineListResponse>(`/medicines?${qs.toString()}`, { token });
}

export function fetchDoctors(token: string) {
  return apiFetch<Doctor[]>("/doctors", { token });
}

export function fetchChambers(token: string) {
  return apiFetch<Chamber[]>("/chambers", { token });
}

export function fetchDoctor(id: string, token: string) {
  return apiFetch<Doctor>(`/doctors/${id}`, { token });
}

export function updateDoctor(
  id: string,
  body: { displayName?: string; bmdcNumber?: string; specialization?: string; designation?: string; qualifications?: string; profileImageUrl?: string },
  token: string
) {
  return apiFetch<Doctor>(`/doctors/${id}`, { method: "PATCH", token, body: JSON.stringify(body) });
}

export function createPrescription(input: CreatePrescriptionInput, token: string) {
  return apiFetch<Prescription>("/prescriptions", {
    method: "POST",
    token,
    body: JSON.stringify(input)
  });
}

export function fetchPrescriptionById(id: string, token: string) {
  return apiFetch<Prescription>(`/prescriptions/${id}`, { token });
}

export function fetchPatientPrescriptions(patientId: string, token: string) {
  return apiFetch<Prescription[]>(`/prescriptions?patientId=${encodeURIComponent(patientId)}&limit=20`, { token });
}

export function sendPrescriptionEmail(
  payload: {
    to: string;
    patientName: string;
    prescriptionNo: string;
    doctorName: string;
    pdfBase64: string;
    filename: string;
  },
  token: string
) {
  return apiFetch<{ ok: true }>("/prescriptions/send-email", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

// ─── Prescription Groups ────────────────────────────────────────────────────

export type PrescriptionGroupSectionType =
  | "COMPLAINT"
  | "INVESTIGATION"
  | "DIAGNOSIS"
  | "MEDICATION"
  | "ADVICE";

export type PrescriptionGroup = {
  id: string;
  sectionType: PrescriptionGroupSectionType;
  name: string;
  items: unknown[];
  createdAt: string;
  updatedAt: string;
};

export function fetchPrescriptionGroups(section: PrescriptionGroupSectionType, token: string) {
  return apiFetch<PrescriptionGroup[]>(`/prescription-groups?section=${section}`, { token });
}

export function createPrescriptionGroup(
  body: { sectionType: PrescriptionGroupSectionType; name: string; items: unknown[] },
  token: string
) {
  return apiFetch<PrescriptionGroup>("/prescription-groups", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function updatePrescriptionGroup(
  id: string,
  body: { name?: string; items?: unknown[] },
  token: string
) {
  return apiFetch<PrescriptionGroup>(`/prescription-groups/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export function deletePrescriptionGroup(id: string, token: string) {
  return apiFetch<{ success: boolean }>(`/prescription-groups/${id}`, {
    method: "DELETE",
    token,
  });
}

// ─── Prescription Templates ──────────────────────────────────────────────────

export type PrescriptionTemplateData = {
  notes: Record<string, string>;
  medicines: unknown[];
  medicationNote: string;
  complaints: unknown[];
  histories: unknown[];
  rxInvestigations: unknown[];
  rxDiagnoses: unknown[];
};

export type PrescriptionTemplate = {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  data: PrescriptionTemplateData;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export function fetchPrescriptionTemplates(token: string) {
  return apiFetch<PrescriptionTemplate[]>("/prescription-templates", { token });
}

export function createPrescriptionTemplate(
  body: { name: string; description?: string; tags?: string[]; data: PrescriptionTemplateData },
  token: string
) {
  return apiFetch<PrescriptionTemplate>("/prescription-templates", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function updatePrescriptionTemplate(
  id: string,
  body: { name?: string; description?: string; tags?: string[] },
  token: string
) {
  return apiFetch<PrescriptionTemplate>(`/prescription-templates/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export function deletePrescriptionTemplate(id: string, token: string) {
  return apiFetch<{ success: boolean }>(`/prescription-templates/${id}`, {
    method: "DELETE",
    token,
  });
}

export function recordPrescriptionTemplateUse(id: string, token: string) {
  return apiFetch<PrescriptionTemplate>(`/prescription-templates/${id}/use`, {
    method: "POST",
    token,
  });
}
