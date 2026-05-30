# PrescriptionOS BD

Production-grade foundation for a cloud-based Doctor Prescription and Chamber Management SaaS platform built for Bangladeshi workflows.

## Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, React Query, Zustand, shadcn-style local components
- Backend: NestJS, REST API, Prisma, JWT auth, RBAC, DTO validation
- Database: PostgreSQL with Prisma schema and `pg_trgm` search indexes
- Cache: Redis
- Deployment: Docker Compose, Nginx, CI-ready workspace

## Monorepo

```txt
apps/
  api/        NestJS REST API
  web/        Next.js PWA dashboard
packages/
  shared/     roles, permissions, shared prescription types
prisma/
  schema.prisma
  sql/postgres-performance.sql
infra/
  nginx/
  postgres/
docs/
```

## First Milestone

A doctor can log in, select chamber context, search/create a patient, search Bangladesh medicines, create a structured prescription, and print/verify it.

## Local Setup

1. Copy environment values.

```bash
cp .env.example .env
```

2. Start infrastructure.

```bash
docker compose up postgres redis -d
```

3. Install dependencies.

```bash
pnpm install
```

4. Generate Prisma client and migrate.

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

5. Apply PostgreSQL performance indexes after the first migration.

```bash
psql "$DATABASE_URL" -f prisma/sql/postgres-performance.sql
```

6. Seed demo tenant/user.

```bash
pnpm db:seed
```

Demo login:

```txt
email: demo@rx.test
password: Password123!
```

7. Import medicines from the provided CSV.

```bash
pnpm medicine:import -- "C:\Users\abuza\Downloads\medicine_information_export.csv"
```

8. Run development servers.

```bash
pnpm dev
```

Frontend: `http://localhost:3000`

Backend: `http://localhost:4000/api/v1`

Swagger: `http://localhost:4000/api/v1/docs`

## Production Direction

The current structure is a modular monolith. Keep it this way until traffic and team size justify splitting services. Each module owns its controller, DTOs, service, and persistence rules, so extracting medicines, notifications, billing, or AI later will be straightforward.

See:

- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [API Endpoints](docs/api-endpoints.md)
- [Roadmap](docs/roadmap.md)

# prescripSys
