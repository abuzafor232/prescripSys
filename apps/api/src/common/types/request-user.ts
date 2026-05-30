export type RequestUser = {
  sub: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
  doctorId?: string;
};
