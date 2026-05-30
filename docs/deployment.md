# Deployment

## Docker Compose

For a single VM deployment:

```bash
cp .env.example .env
docker compose up -d --build
```

Run migrations before exposing the app:

```bash
docker compose exec api pnpm --filter @bd-prescription/api prisma:deploy
docker compose exec postgres psql -U postgres -d bd_prescription -f /path/to/prisma/sql/postgres-performance.sql
```

## Production Checklist

- Use managed PostgreSQL with automated backups and PITR.
- Use managed Redis or a private Redis instance with authentication.
- Put Nginx or a cloud load balancer in front of API and web.
- Enforce HTTPS and HSTS.
- Rotate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- Store file uploads in S3 or Cloudflare R2.
- Enable object versioning for prescription assets/signatures.
- Add daily encrypted database backups.
- Add audit-log retention rules.
- Use read replicas before splitting services.
- Add queue workers for SMS, PDF generation, imports, and AI jobs.

## Recommended Environments

- `development`: local Docker services
- `staging`: production-like data volume, test SMS/payment providers
- `production`: managed database, managed storage, observability, backups

## Scaling Plan

1. Keep backend as modular monolith.
2. Move long-running jobs to workers.
3. Add search engine if PostgreSQL search is no longer enough.
4. Add read replicas for reports.
5. Split notifications, billing, AI, or medicine search only after clear load boundaries appear.
