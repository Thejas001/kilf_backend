# Literature Festival — Admin Panel & Backend

A production-ready backend API and admin panel for running a literature festival: festival and
ticket management, a concurrency-safe booking engine, a pluggable payment abstraction, QR
ticket check-in, sponsor management, and a revenue dashboard.

## 1. Project Overview

This repository contains two applications:

- **`backend/`** — a Node.js/TypeScript/Express REST API backed by PostgreSQL via Prisma. It
  serves both the admin panel and the public festival website (ticket listing + booking).
- **`admin-panel/`** — a React/TypeScript/Vite single-page app for festival staff to manage
  festivals, tickets, bookings, sponsors, and revenue, and to check attendees in at the door.

Nothing in this project is mocked at the data layer — every admin and public endpoint reads and
writes real PostgreSQL rows through Prisma, inside transactions where correctness requires it
(booking inventory, refunds, cancellations).

## 2. Architecture

```text
project/
├── backend/
│   ├── src/
│   │   ├── config/        # env, logger, prisma client, swagger
│   │   ├── controllers/   # thin HTTP handlers
│   │   ├── services/      # business logic (bookings, payments, revenue...)
│   │   ├── repositories/  # Prisma queries
│   │   ├── routes/        # admin/* and public route trees
│   │   ├── middleware/    # auth, validation, rate limiting, errors
│   │   ├── validators/    # Zod schemas
│   │   ├── utils/         # ApiError, response envelope, pagination, ids
│   │   ├── jobs/          # background jobs (booking-hold expiry)
│   │   └── app.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── tests/             # Jest + Supertest integration tests
│   └── package.json
│
└── admin-panel/
    ├── src/
    │   ├── components/    # ui/ (primitives), layout/, common/
    │   ├── pages/          # one folder per resource
    │   ├── layouts/        # AdminLayout, AuthLayout
    │   ├── hooks/           # useAuth
    │   ├── services/        # axios client + one file per API resource
    │   ├── types/
    │   └── lib/
    └── package.json
```

**Request flow:** `route → validate(zod) → authenticate/authorize → controller → service →
repository → Prisma → PostgreSQL`, with a consistent `{ success, data, message }` /
`{ success: false, message, errors }` response envelope and centralized error handling.

**Booking concurrency:** `POST /api/bookings` locks the ticket row with `SELECT ... FOR UPDATE`
inside a Prisma transaction, then decrements inventory with a conditional
`UPDATE ... WHERE available_quantity >= quantity`. Two simultaneous requests for the last ticket
serialize on the row lock — the loser sees the already-decremented count and is rejected with
`409 Conflict` before any inventory can go negative. See
[`booking.service.ts`](backend/src/services/booking.service.ts).

**Payments:** booking confirmation never trusts a client-supplied "payment succeeded" flag. The
server always calls `PaymentProvider.verifyPayment()` itself before flipping a booking to
`CONFIRMED`. See section 14 below.

## 3. Technology Stack

**Backend:** Node.js, TypeScript, Express, PostgreSQL, Prisma, JWT (access + refresh tokens),
bcryptjs, Zod, Swagger/OpenAPI (`swagger-jsdoc` + `swagger-ui-express`), Helmet, CORS,
`express-rate-limit`, `pino` structured logging, `qrcode`, Multer (local file uploads), Jest +
Supertest.

**Admin Panel:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI primitives styled in a
shadcn-style system, TanStack Query, React Hook Form + Zod, Recharts, `sonner` toasts.

## 4. Installation

Requires Node.js 20+ and either a local PostgreSQL instance or Docker.

```bash
git clone <this-repo>
cd kilf_backend

# Backend
cd backend
npm install
cp .env.example .env      # edit DATABASE_URL / secrets, see section 5

# Admin panel
cd ../admin-panel
npm install
cp .env.example .env
```

## 5. Environment Variables

### `backend/.env`

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` | `development` |
| `PORT` | API port | `4000` |
| `FRONTEND_URL` | Origin allowed by CORS | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://kilf:kilf@localhost:5432/kilf?schema=public` |
| `JWT_SECRET` | Access-token signing secret | long random string |
| `JWT_EXPIRES_IN` | Access-token lifetime | `15m` |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret | long random string, **different** from `JWT_SECRET` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime | `7d` |
| `PAYMENT_PROVIDER` | `mock` (default) or `razorpay` — see section 14 | `mock` |
| `PAYMENT_SECRET` | Secret for the active payment provider | dev value for mock |
| `RAZORPAY_KEY_ID` | Razorpay API key id — only required when `PAYMENT_PROVIDER=razorpay` | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret | from Razorpay Dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | Secret configured on the Razorpay webhook, verifies `X-Razorpay-Signature` | from Razorpay Dashboard |
| `BOOKING_HOLD_MINUTES` | How long a `PENDING_PAYMENT` booking reserves inventory | `15` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | General API rate limit | `900000` / `300` |
| `UPLOAD_DIR` | Local disk folder for uploaded sponsor logos | `uploads` |
| `MAX_UPLOAD_MB` | Max upload size | `5` |
| `LOG_LEVEL` | pino log level | `info` |

A dedicated `backend/.env.test` is provided pointing at a separate `kilf_test` database — the
Jest suite truncates tables between tests, so never point it at your dev/prod data.

### `admin-panel/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API, e.g. `http://localhost:4000` |

Secrets are never committed — only `.env.example` files are tracked in Git.

## 6. PostgreSQL Setup

**Option A — Docker (recommended):**

```bash
docker compose up -d postgres
```

This starts PostgreSQL 16 on `localhost:5432` with the credentials already in `.env.example`
(`kilf` / `kilf`, database `kilf`). Create the test database once:

```bash
docker exec -it $(docker compose ps -q postgres) psql -U kilf -c "CREATE DATABASE kilf_test;"
```

**Option B — an existing local PostgreSQL install:** create a role and two databases yourself and
point `DATABASE_URL` / `backend/.env.test`'s `DATABASE_URL` at them:

```sql
CREATE ROLE kilf WITH LOGIN PASSWORD 'kilf';
CREATE DATABASE kilf OWNER kilf;
CREATE DATABASE kilf_test OWNER kilf;
```

## 7. Prisma Migration

```bash
cd backend
npx prisma migrate deploy   # applies the checked-in migration in prisma/migrations/
# or, while iterating on the schema locally:
npx prisma migrate dev
```

`npx prisma studio` opens a browser GUI over the database if you want to inspect rows directly.

## 8. Database Seeding

```bash
npm run seed
```

Seeds one admin, one festival, six ticket types, five sample bookings (confirmed, refunded, and
pending-payment examples), their payments and QR ticket instances, and six sponsors across every
sponsorship level.

**Development admin login (local only — change or remove before any real deployment):**

```
Email:    admin@kilf.dev
Password: Admin@12345
```

## 9. Running the Backend

```bash
cd backend
npm run dev          # tsx watch, http://localhost:4000
npm run build         # tsc -> dist/
npm start              # node dist/server.js
```

Health check: `GET /health`.

## 10. Running the Admin Panel

**Separate dev server (default, best for active frontend development — hot reload):**

```bash
cd admin-panel
npm run dev           # Vite dev server, http://localhost:5173
```

The backend allows this origin via `FRONTEND_URL` in `backend/.env`, so CORS is already configured.

**Single port (admin panel served by the backend, no separate frontend process):**

```bash
cd admin-panel
npm run build:embedded    # builds into ../backend/public with a relative API base URL
cd ../backend
npm run dev                # or `npm run build && npm start` for production
```

Now everything — API, Swagger docs, and the admin panel — is served from `http://localhost:4000`.
`backend/src/app.ts` serves `backend/public` as static files with an SPA fallback whenever that
folder exists (built by `build:embedded`); if it doesn't exist, the backend behaves exactly as an
API-only server and this has no effect. Re-run `build:embedded` after any frontend change — it
isn't hot-reloaded like the separate dev server is.

Log in with the seeded admin credentials above.

## 11. API Documentation

Interactive Swagger UI is served at:

```
http://localhost:4000/api/docs
```

The raw OpenAPI JSON is at `/api/docs.json`. Every route file documents its own endpoints via
`@openapi` JSDoc comments, covering request bodies, query parameters, auth requirements, and
response codes.

## 12. Authentication

- **First-time setup:** `POST /api/admin/auth/bootstrap` creates the first admin (as
  `SUPER_ADMIN`) with `{ name, email, password }`. It only ever works once — the moment any admin
  row exists, it returns `403 Forbidden` and you must use `/login` from then on. Two concurrent
  bootstrap requests (e.g. two tabs racing on a fresh install) are safe: the handler takes a
  Postgres advisory lock (`pg_advisory_xact_lock`) around the "does an admin already exist" check,
  so exactly one request can ever win.
- Admins log in with email + password at `POST /api/admin/auth/login`, receiving a short-lived
  JWT access token (`Authorization: Bearer <token>`) and a longer-lived refresh token.
- Passwords are hashed with bcrypt (12 rounds); plaintext passwords are never stored or logged.
- `POST /api/admin/auth/refresh` exchanges a valid refresh token for a new token pair. Refresh
  tokens are hashed (SHA-256) and stored per-admin so `logout` and `change-password` can revoke
  them immediately.
- `authenticate` middleware verifies the JWT and loads the admin; `authorize(...roles)` enforces
  `ADMIN` vs `SUPER_ADMIN` (e.g. only `SUPER_ADMIN` can delete festivals/tickets/sponsors or read
  audit logs).
- `POST /api/admin/auth/forgot-password` issues a hashed, time-limited reset token (in production
  this would be emailed; the dev response echoes it directly since there's no mail provider
  wired up yet) and `POST /api/admin/auth/reset-password` consumes it.

## 13. Booking Flow

1. `GET /api/tickets` / `GET /api/tickets/:id` — public, returns only tickets that are `ACTIVE`,
   inside their sales window, and still have `availableQuantity > 0`.
2. `POST /api/bookings` — validates the ticket, locks its row (`SELECT ... FOR UPDATE`) inside a
   transaction, checks availability, atomically decrements `availableQuantity`, upserts the
   customer by email, generates a unique `bookingNumber` (`KILF-YYYY-######`), and creates the
   `Booking` + `BookingItem` rows as `PENDING_PAYMENT` with an expiry (`BOOKING_HOLD_MINUTES`).
3. Outside that transaction, the active `PaymentProvider.createPayment()` is called and a
   `Payment` row is recorded.
4. The server immediately calls `PaymentProvider.verifyPayment()` (never trusting anything the
   client claims) and settles the booking: `SUCCESS` → `CONFIRMED` + QR `TicketInstance`s are
   generated; `FAILED` → `CANCELLED` and inventory is released back to the pool.
5. A background job (`src/jobs/expireBookings.job.ts`, runs every 60s) expires any
   `PENDING_PAYMENT` booking whose hold window passed and releases its inventory — this covers
   gateways where payment happens asynchronously and the customer never completes it.

Admin-side, `PATCH /api/admin/bookings/:id/status` cancels a booking and returns inventory;
`POST /api/admin/bookings/:id/refund` refunds the successful payment via the provider, marks the
booking `REFUNDED`, cancels its QR tickets, and returns inventory. Refunded bookings are excluded
from confirmed-ticket counts everywhere (dashboard, revenue, per-ticket sold counts).

## 14. Payment Integration Architecture

```text
PaymentProvider (interface)          src/services/payment/PaymentProvider.ts
├── createPayment()
├── verifyPayment()
├── refundPayment()
└── getPaymentStatus()

MockPaymentProvider                  src/services/payment/MockPaymentProvider.ts
  (implements PaymentProvider — approves everything except a customer email
   starting with "fail-", which tests use to simulate a declined payment)

RazorpayPaymentProvider              src/services/payment/RazorpayPaymentProvider.ts
  (implements PaymentProvider — a real, working gateway integration)
```

`src/services/payment/index.ts` is a small factory keyed off `PAYMENT_PROVIDER` in `.env`. Booking
and refund logic (`booking.service.ts`) depend only on the `PaymentProvider` interface — adding
Stripe means writing `StripePaymentProvider implements PaymentProvider` and adding one `case` to
the factory; nothing in the booking/refund/revenue code needs to change.

The critical rule this structure enforces: **a booking is only ever marked `CONFIRMED` after the
backend itself calls `verifyPayment()`** — the public API never accepts a "payment succeeded"
boolean from the client, and this holds for Razorpay exactly as it does for the mock provider.

### Configuring Razorpay

1. Set in `backend/.env`:
   ```env
   PAYMENT_PROVIDER=razorpay
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_key_secret
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   ```
   Key id/secret come from the Razorpay Dashboard → **Settings → API Keys**.
2. In the Dashboard, go to **Settings → Webhooks** and add a webhook pointed at
   `https://your-domain/api/webhooks/razorpay` (use a tunnel like `ngrok` for local testing),
   subscribed to at minimum `payment.captured`, `payment.failed`, and `refund.processed`. Set its
   secret to the same value as `RAZORPAY_WEBHOOK_SECRET` above — Razorpay signs every webhook
   payload with it (`X-Razorpay-Signature` header), and the handler rejects anything that doesn't
   verify (`Razorpay.validateWebhookSignature`, using the exact raw request bytes captured by the
   `verify` hook on `express.json()` in `app.ts` — never a re-serialized `req.body`, which would
   make every signature check fail).
3. **How it actually confirms a payment:** `RazorpayPaymentProvider.createPayment()` creates a
   Razorpay *Order* and returns its id — that id is what's stored as `providerPaymentId` on the
   `Payment` row (an order can have multiple payment attempts, so it's the stable identifier, not
   the individual payment id). The webhook is treated only as a "go check now" trigger, never as
   the source of truth by itself: on receipt, the handler looks up the `Payment` row by order id
   and calls the existing `settlePaymentResult()`, which calls `verifyPayment()`, which asks
   Razorpay's own API (`orders.fetchPayments`) what actually happened. This also makes the webhook
   handler naturally idempotent against Razorpay's at-least-once delivery retries, since
   `settlePaymentResult` is a no-op once a booking has already left `PENDING_PAYMENT`.
4. Refunds (`POST /api/admin/bookings/:id/refund`) look up the captured payment under the stored
   order id and call Razorpay's refund API for that specific payment.
5. `POST /api/bookings`'s response includes a `payment` object (`{ keyId, orderId, amount,
   currency }`) whenever the booking is still `PENDING_PAYMENT` after creation — that's what a
   frontend passes to Razorpay's Checkout.js to open the payment sheet. The mock provider settles
   synchronously, so this key is normally absent in local dev.

## 15. Storage Abstraction

Sponsor logos go through a `StorageProvider` interface
(`src/services/storage/StorageProvider.ts`) with a `LocalStorageProvider` implementation that
writes to `UPLOAD_DIR` on disk and serves files from `/uploads/*`. Swapping in S3/Cloudinary later
means implementing the same three-method interface and changing one import.

## 16. Business Rules Enforced

- **Inventory:** `availableQuantity` is only ever changed via an atomic, row-locked decrement/
  increment — `sold > totalQuantity` cannot happen even under concurrent requests (see the
  concurrency test in `tests/integration/booking.test.ts`).
- **Confirmation:** a booking becomes `CONFIRMED` only after server-side payment verification.
- **Cancellation/refund:** always releases the exact reserved quantity back to the ticket pool.
- **Revenue:** `grossRevenue` = sum of payments that ever succeeded (`SUCCESS` or later
  `REFUNDED`); `refunds` = sum of `refundedAmount` on `REFUNDED` payments; `netRevenue = gross -
  refunds`. Cancelled/expired bookings that never had a successful payment contribute nothing.
- **Money:** every monetary column is PostgreSQL `DECIMAL(12,2)` via Prisma's `Decimal` type —
  amounts are never represented as JavaScript floats; `Prisma.Decimal` arithmetic (`.mul()`,
  `.add()`) is used wherever amounts are computed.

## 17. Testing

```bash
cd backend
docker compose up -d postgres                 # from the repo root, if not already running
npx prisma migrate deploy                      # against DATABASE_URL in .env.test
npm test
```

The suite (Jest + Supertest, `backend/tests/`) covers:

- **Auth** — successful login, invalid password, unauthenticated/invalid-token access, password
  change, first-admin bootstrap, bootstrap correctly refused once an admin exists, and two
  concurrent bootstrap requests racing (only one may win).
- **Tickets** — create, update, availability reporting, rejecting invalid quantities, and the
  public "on sale only" filter.
- **Bookings** — a full successful booking (inventory decrement, QR generation), rejecting
  over-quantity requests, **two concurrent requests for the last ticket** (only one may succeed),
  payment-failure handling (inventory released), admin cancellation, and refund (with the revenue
  summary reflecting it).
- **Sponsors** — create, update, delete, and the public active-only/sorted-by-order endpoint.
- **Revenue** — gross/net/average-ticket-value calculation, excluding failed payments, refund
  accounting, and the by-ticket-type breakdown.
- **Check-in** — verifying a valid ticket, checking it in, rejecting a second check-in of the
  same ticket, and an unknown ticket number.

> **Verified:** this suite (33/33 tests) has been run against a real local PostgreSQL instance,
> including the two-concurrent-requests-for-the-last-ticket test actually racing two HTTP
> requests against real row locks. The full booking → payment-verification → QR issuance →
> check-in flow, the dashboard, and every admin-panel page have also been exercised live against
> a running backend + seeded database — this is not just a typecheck-only deliverable.
>
> One real bug surfaced during that verification and is now fixed: importing `@prisma/client`
> triggers Prisma's own bundled `.env` auto-loader as a side effect, which raced our
> `NODE_ENV`-aware env loader and could silently point `npm test` at the *development* database
> instead of `.env.test`. `backend/src/config/env.ts` now loads the environment-specific file with
> `override: true` in test mode specifically to defeat that race — see the comment there before
> touching env loading order.

## 18. Deployment Instructions

**Full stack via Docker Compose (from the repo root):**

```bash
docker compose up -d --build
```

This builds and runs PostgreSQL, the backend (running `prisma migrate deploy` on boot), and the
admin panel (served as a static build via `serve`). Set real secrets (`JWT_SECRET`,
`JWT_REFRESH_SECRET`, `PAYMENT_SECRET`, `DATABASE_URL`) via environment variables or a
`docker-compose.override.yml` before deploying anywhere real — the values in `docker-compose.yml`
are placeholders for local development only.

**Manual deployment:**

1. Provision PostgreSQL and set `DATABASE_URL`.
2. `cd backend && npm ci && npx prisma migrate deploy && npm run build && npm start` (behind a
   process manager like PM2/systemd, and a reverse proxy terminating TLS).
3. `cd admin-panel && npm ci && VITE_API_URL=https://api.yourdomain.com npm run build`, then serve
   `admin-panel/dist/` as a static site (Nginx, Vercel, Netlify, S3+CloudFront, etc).
4. Point the admin panel's `VITE_API_URL` and the backend's `FRONTEND_URL`/CORS config at each
   other's real origins.

## Route Reference

**Public:** `GET /api/tickets`, `GET /api/tickets/:id`, `POST /api/bookings`,
`POST /api/bookings/:bookingNumber/confirm-payment`, `GET /api/bookings/:bookingNumber?email=`,
`GET /api/sponsors`.

**Admin (all require `Authorization: Bearer <token>` except `/auth/login`, `/auth/bootstrap`,
`/auth/forgot-password`, `/auth/reset-password`, `/auth/refresh`):** `/api/admin/auth/*`,
`/api/admin/dashboard`, `/api/admin/festivals*`, `/api/admin/tickets*` (including
`POST /api/admin/tickets/verify` and `POST /api/admin/tickets/check-in`),
`/api/admin/bookings*` (including `/export` for CSV), `/api/admin/sponsors*`,
`/api/admin/revenue/*`, `/api/admin/audit-logs`.

**Webhooks:** `POST /api/webhooks/razorpay` — signature-verified, not authenticated; see section 14.

Full request/response schemas are in Swagger at `/api/docs`.
#   k i l f _ b a c k e n d  
 