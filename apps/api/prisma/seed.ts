import { PERMISSIONS, ROLES } from "@bd-prescription/shared";
import { Prisma, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-clinic" },
    update: {},
    create: {
      name: "Demo Clinic",
      slug: "demo-clinic",
      status: "ACTIVE",
      plan: "starter"
    }
  });

  const permissionRecords = await Promise.all(
    Object.values(PERMISSIONS).map((name) =>
      prisma.permission.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name } },
        update: {},
        create: { tenantId: tenant.id, name }
      })
    )
  );

  const roles = await Promise.all(
    [ROLES.OWNER, ROLES.ADMIN, ROLES.DOCTOR, ROLES.ASSISTANT].map((name) =>
      prisma.role.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name } },
        update: {},
        create: { tenantId: tenant.id, name, isSystem: true }
      })
    )
  );

  const permissionByName = new Map(permissionRecords.map((item) => [item.name, item]));
  const roleByName = new Map(roles.map((item) => [item.name, item]));

  await grant(roleByName.get(ROLES.OWNER)!.id, Object.values(PERMISSIONS));
  await grant(roleByName.get(ROLES.ADMIN)!.id, [
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.DOCTORS_MANAGE,
    PERMISSIONS.CHAMBERS_MANAGE,
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.PRESCRIPTIONS_READ,
    PERMISSIONS.PRESCRIPTIONS_WRITE,
    PERMISSIONS.PRESCRIPTIONS_PRINT,
    PERMISSIONS.MEDICINES_MANAGE,
    PERMISSIONS.APPOINTMENTS_MANAGE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.SETTINGS_MANAGE
  ]);
  await grant(roleByName.get(ROLES.DOCTOR)!.id, [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.PRESCRIPTIONS_READ,
    PERMISSIONS.PRESCRIPTIONS_WRITE,
    PERMISSIONS.PRESCRIPTIONS_PRINT,
    PERMISSIONS.APPOINTMENTS_MANAGE,
    PERMISSIONS.REPORTS_READ
  ]);
  await grant(roleByName.get(ROLES.ASSISTANT)!.id, [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.PRESCRIPTIONS_READ,
    PERMISSIONS.APPOINTMENTS_MANAGE
  ]);

  const passwordHash = await bcrypt.hash("Password123!", 12);
  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "demo@rx.test" } },
    update: { passwordHash },
    create: {
      tenantId: tenant.id,
      email: "demo@rx.test",
      phone: "01700000000",
      fullName: "Dr. Demo User",
      passwordHash,
      status: "ACTIVE"
    }
  });

  for (const roleName of [ROLES.OWNER, ROLES.DOCTOR]) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: roleByName.get(roleName)!.id
        }
      },
      update: {},
      create: { userId: user.id, roleId: roleByName.get(roleName)!.id }
    });
  }

  const doctor = await prisma.doctor.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: user.id,
      displayName: "Dr. Demo User",
      bmdcNumber: "A-00000",
      specialization: "Medicine",
      designation: "Consultant"
    }
  });

  const chamber = await prisma.chamber.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Main Chamber" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Main Chamber",
      address: "Dhaka, Bangladesh",
      phone: "01700000000",
      serialPrefix: "M"
    }
  });

  await prisma.doctorChamber.upsert({
    where: {
      doctorId_chamberId: { doctorId: doctor.id, chamberId: chamber.id }
    },
    update: {},
    create: { doctorId: doctor.id, chamberId: chamber.id, isDefault: true }
  });

  await prisma.dosageTemplate.createMany({
    data: [
      {
        tenantId: tenant.id,
        doctorId: doctor.id,
        name: "BD twice daily",
        dose: "1+0+1",
        duration: "5 Days",
        instruction: "After Meal"
      },
      {
        tenantId: tenant.id,
        doctorId: doctor.id,
        name: "TDS",
        dose: "1+1+1",
        duration: "7 Days",
        instruction: "After Meal"
      }
    ],
    skipDuplicates: true
  });

  await seedDemoMedicines();

  console.log({
    tenant: tenant.slug,
    email: "demo@rx.test",
    password: "Password123!"
  });

  async function grant(roleId: string, permissionNames: string[]) {
    await Promise.all(
      permissionNames.map((name) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId: permissionByName.get(name)!.id
            }
          },
          update: {},
          create: {
            roleId,
            permissionId: permissionByName.get(name)!.id
          }
        })
      )
    );
  }
}

async function seedDemoMedicines() {
  const source = "demo-seed";
  const demoMedicines = [
    ["Napa", "Paracetamol", "500 mg", "Tablet", "Beximco Pharmaceuticals"],
    ["Napa Extra", "Paracetamol + Caffeine", "500 mg + 65 mg", "Tablet", "Beximco Pharmaceuticals"],
    ["Ace", "Paracetamol", "500 mg", "Tablet", "Square Pharmaceuticals"],
    ["Sergel", "Esomeprazole", "20 mg", "Capsule", "Healthcare Pharmaceuticals"],
    ["Seclo", "Omeprazole", "20 mg", "Capsule", "Square Pharmaceuticals"],
    ["Maxpro", "Esomeprazole", "20 mg", "Capsule", "Renata"],
    ["Monas", "Montelukast", "10 mg", "Tablet", "ACME Laboratories"],
    ["Fexo", "Fexofenadine", "120 mg", "Tablet", "Square Pharmaceuticals"],
    ["Alatrol", "Cetirizine", "10 mg", "Tablet", "Square Pharmaceuticals"],
    ["Histacin", "Chlorpheniramine Maleate", "4 mg", "Tablet", "Jayson Pharmaceuticals"],
    ["Omidon", "Domperidone", "10 mg", "Tablet", "Incepta Pharmaceuticals"],
    ["DP", "Domperidone", "10 mg", "Tablet", "Beximco Pharmaceuticals"],
    ["Flagyl", "Metronidazole", "400 mg", "Tablet", "Sanofi"],
    ["Zimax", "Azithromycin", "500 mg", "Tablet", "Square Pharmaceuticals"],
    ["Azithrocin", "Azithromycin", "500 mg", "Tablet", "Acme Laboratories"],
    ["Cef-3", "Cefixime", "200 mg", "Capsule", "Square Pharmaceuticals"],
    ["Ciprocin", "Ciprofloxacin", "500 mg", "Tablet", "Square Pharmaceuticals"],
    ["Ceevit", "Vitamin C", "250 mg", "Tablet", "Square Pharmaceuticals"],
    ["LUBGEL EYE DROP", "Carboxymethylcellulose Sodium", "1%", "Eye Drop", "Popular Pharmaceuticals"],
    ["OPTIMOX EYE DROP", "Moxifloxacin", "0.5%", "Eye Drop", "Popular Pharmaceuticals"],
    ["PATADIN DS EYE DROP", "Olopatadine", "0.2%", "Eye Drop", "Popular Pharmaceuticals"]
  ] as const;

  await prisma.medicine.createMany({
    data: demoMedicines.map(
      ([brandName, genericName, strength, dosageForm, companyName]) => ({
        tenantId: null,
        globalKey: `${source}:${normalizeSearchText(`${brandName}-${genericName}-${strength}-${dosageForm}`)}`,
        brandName,
        genericName,
        strength,
        dosageForm,
        companyName,
        source,
        normalizedBrand: normalizeSearchText(brandName),
        normalizedGeneric: normalizeSearchText(genericName),
        normalizedCompany: normalizeSearchText(companyName),
        searchText: buildMedicineSearchText({
          brandName,
          genericName,
          companyName,
          strength,
          dosageForm
        }),
        importedAt: new Date()
      }) satisfies Prisma.MedicineCreateManyInput
    ),
    skipDuplicates: true
  });
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildMedicineSearchText(input: {
  brandName: string;
  genericName: string;
  companyName?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
}) {
  return normalizeSearchText(
    [
      input.brandName,
      input.genericName,
      input.companyName,
      input.strength,
      input.dosageForm
    ]
      .filter(Boolean)
      .join(" ")
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
