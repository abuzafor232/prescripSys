export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  DOCTOR: "doctor",
  ASSISTANT: "assistant",
  BILLING: "billing"
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  TENANT_MANAGE: "tenant.manage",
  USERS_MANAGE: "users.manage",
  DOCTORS_MANAGE: "doctors.manage",
  CHAMBERS_MANAGE: "chambers.manage",
  PATIENTS_READ: "patients.read",
  PATIENTS_WRITE: "patients.write",
  PRESCRIPTIONS_READ: "prescriptions.read",
  PRESCRIPTIONS_WRITE: "prescriptions.write",
  PRESCRIPTIONS_PRINT: "prescriptions.print",
  MEDICINES_MANAGE: "medicines.manage",
  APPOINTMENTS_MANAGE: "appointments.manage",
  BILLING_MANAGE: "billing.manage",
  REPORTS_READ: "reports.read",
  AUDIT_READ: "audit.read",
  SETTINGS_MANAGE: "settings.manage"
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
