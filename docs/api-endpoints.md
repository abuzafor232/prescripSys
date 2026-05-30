# API Endpoints

Base path: `/api/v1`

## Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Doctors

- `GET /doctors`
- `POST /doctors`
- `GET /doctors/:id`

## Chambers

- `GET /chambers`
- `POST /chambers`
- `GET /chambers/:id`

## Patients

- `GET /patients?page=1&limit=20&q=hasan`
- `POST /patients`
- `GET /patients/:id`
- `PATCH /patients/:id`
- `DELETE /patients/:id`

## Medicines

- `GET /medicines/search?q=napa&limit=20`
- `POST /medicines/import`

## Prescriptions

- `GET /prescriptions`
- `POST /prescriptions`
- `GET /prescriptions/:id`
- `PATCH /prescriptions/:id`
- `POST /prescriptions/:id/sign`
- `GET /prescriptions/verify/:token`

## Appointments

- `GET /appointments?date=2026-05-26&chamberId=...`
- `POST /appointments`
- `PATCH /appointments/:id/status`

## Operations

- `GET /reports/dashboard`
- `GET /audit-logs`
- `GET /settings`
- `PUT /settings/:scope/:key`
- `GET /billing/summary`
- `GET /notifications/providers`
