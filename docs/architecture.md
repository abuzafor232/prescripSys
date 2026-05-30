# Architecture

## SaaS Tenancy

The platform uses shared-table multi-tenancy. Every tenant-owned model has `tenantId`, and every authenticated request gets `tenantId` from the access token.

This is the right first production shape because it is operationally simple, cost-effective, and still scalable. If a large hospital later needs isolation, tenant data can be migrated to a separate database because module boundaries are already explicit.

## Backend Modules

- `auth`: JWT login, refresh-token sessions, password hashing, session revoke
- `users`: tenant-scoped user management
- `doctors`: profile, BMDC number, signatures, prescription preferences
- `chambers`: chamber header, address, timings, serial rules
- `patients`: patient profile, history, follow-up lookup
- `medicines`: CSV import, typo-tolerant search, Redis caching
- `prescriptions`: structured prescriptions, item rows, version history, QR verification
- `appointments`: chamber-wise serials and queue state
- `billing`: subscription and local payment provider extension point
- `notifications`: SMS/email provider abstraction
- `reports`: dashboard analytics
- `audit_logs`: login and activity trace
- `settings`: tenant/chamber/doctor configuration

## Prescription Data

Prescriptions are not stored as text blobs. The schema keeps:

- prescription header fields
- diagnosis rows
- investigation rows
- medicine item rows
- advice and follow-up
- immutable version snapshots

This supports printing, analytics, AI assistance, drug interaction checks, copy-from-previous, and future clinical safety controls.

## Medicine Search

The first search layer is PostgreSQL:

- normalized brand/generic/company columns
- `searchText` field
- `pg_trgm` indexes
- Redis cache for frequent queries

This is enough for a fast MVP. Add Meilisearch or OpenSearch later only when typo/Bangla tolerance requires more ranking control.

## Future AI Boundary

AI should be an assistant layer, not mixed into prescription persistence. Add future AI modules behind explicit service interfaces:

- prescription suggestions
- drug interaction checks
- Bangla voice-to-prescription
- handwritten OCR extraction
- diagnosis suggestions

Every AI action should produce explainable draft data and audit logs.
