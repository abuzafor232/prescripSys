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

export function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "error" in error) {
    const body = (error as ApiError).error;
    if (typeof body === "string") return body;
    if (typeof body === "object" && body !== null && "message" in body) {
      const message = (body as { message?: unknown }).message;
      if (Array.isArray(message)) return message.join(", ");
      if (typeof message === "string") return message;
    }
  }

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

export function createPatient(input: CreatePatientInput, token: string) {
  return apiFetch<Patient>("/patients", {
    method: "POST",
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

export function fetchDoctors(token: string) {
  return apiFetch<Doctor[]>("/doctors", { token });
}

export function fetchChambers(token: string) {
  return apiFetch<Chamber[]>("/chambers", { token });
}

export function createPrescription(input: CreatePrescriptionInput, token: string) {
  return apiFetch<Prescription>("/prescriptions", {
    method: "POST",
    token,
    body: JSON.stringify(input)
  });
}
