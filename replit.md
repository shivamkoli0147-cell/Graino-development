# KisanDirect

A full-stack mobile-first agriculture selling web app for Rohit Mukati (single seller) serving 8–10 villages in rural Madhya Pradesh, India. Two modes: Customer App and Seller Dashboard.

---

## ⚠️ CRITICAL — READ BEFORE MAKING ANY CHANGES

**This project uses Supabase for BOTH the database AND file storage. This is a permanent, non-negotiable requirement.**

- **NEVER** provision or switch to Replit's built-in PostgreSQL database.
- **NEVER** replace Supabase Storage with Replit Object Storage or any other storage service.
- **NEVER** move the database connection string to an environment variable or secret. It must remain hardcoded in `config.js` (root) and `artifacts/api-server/src/config.ts`.
- **NEVER** move the 2Factor.in OTP API key to an environment variable or Replit secret. It must remain hardcoded in `artifacts/api-server/src/config.ts` (`TWOFACTOR_API_KEY`), same convention as the Supabase credentials.
- **NEVER** run `createDatabase()`, `checkDatabase()`, or any Replit database provisioning tool on this project.
- **NEVER** run `drizzle-kit push` against Replit's DATABASE_URL — only push against the Supabase URL in `config.js`.
- The Supabase connection string, service role key, and storage bucket name in `artifacts/api-server/src/config.ts` must stay hardcoded exactly as they are.

This applies even during import, migration, or when cloning this project to any new Replit account.

---

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080, auto-builds on start)
- `pnpm --filter @workspace/kisan-direct run dev` — Frontend (port 21034)
- `pnpm --filter @workspace/kisan-direct run typecheck` — TypeScript check for frontend
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API hooks and Zod schemas from OpenAPI spec
- Required env: **none** — all credentials are hardcoded in `config.js` and `config.ts`

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4, Baloo 2 font
- API: Express 5
- **DB: Supabase PostgreSQL (via Drizzle ORM + `pg` driver) — hardcoded in `config.js` and `artifacts/api-server/src/config.ts`**
- **Storage: Supabase Storage bucket `product-images` — hardcoded in `artifacts/api-server/src/config.ts`**
- API codegen: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- State: React state only (no external state library)

## Where things live

- `config.js` — Root config, hardcodes `DATABASE_URL` and injects into `process.env`
- `artifacts/api-server/src/config.ts` — Hardcoded Supabase DB URL, service role key, storage bucket
- `artifacts/api-server/src/db.ts` — Drizzle ORM setup using Supabase PostgreSQL
- `artifacts/api-server/src/routes/kisanRoutes.ts` — All KisanDirect API routes + Supabase Storage upload/delete helpers
- `artifacts/kisan-direct/src/App.tsx` — Main app with customer/seller mode toggle
- `artifacts/kisan-direct/src/pages/` — All page components (Customer + Seller)
- `artifacts/kisan-direct/src/lib/utils.ts` — Cart types, session helpers, formatINR
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks
- `lib/db/` — Drizzle schema definitions and drizzle.config.ts

## Architecture decisions

- **Database**: Supabase PostgreSQL with Drizzle ORM — connection string is hardcoded, NOT in environment variables
- **File storage**: Supabase Storage (`product-images` bucket) — credentials hardcoded in `config.ts`
- Single-page React app with mode toggle button (Customer ↔ Seller) — no URL routing needed
- Cart state in React (App.tsx) using plain objects keyed by `productId-varietyId`
- Customer session in localStorage, seller session in sessionStorage
- OTP auth uses real SMS via 2Factor.in (`artifacts/api-server/src/otpService.ts`), except the fixed seller number `9999999999` which always uses OTP `7089` and never sends an SMS
- DB is seeded automatically on first startup if tables are empty

## Product

- **Customer App**: Login with phone+village+OTP → Browse 6 products with multiple varieties → Add to cart with kg-based quantity → Place orders → Track order status → Request returns
- **Seller Dashboard**: Login (Rohit Mukati) → View today's earnings & new orders → Manage all orders (accept/dispatch/deliver/cancel) → Toggle product variety stock on/off → Upload/manage product images

## User preferences

- Hindi text throughout the customer-facing UI
- Max-width 390px centered, dark green (#1a3d1a) outer background
- Baloo 2 Google font
- 10 delivery villages: Pichor, Bamori, Datia, Indergarh, Bhander, Dabra, Karera, Lahar, Mohna, Shivpuri
- Seller: Rohit Mukati
- **ALWAYS use the hardcoded Supabase DATABASE_URL in `config.js` and `config.ts` — never replace with Replit's built-in database or any environment variable**
- **ALWAYS use Supabase Storage for image uploads — never replace with Replit Object Storage**

## Play Store readiness — progress

Done:
- **Privacy Policy & Terms of Service**: `artifacts/kisan-direct/src/pages/LegalPage.tsx`, linked from login screen (`CustomerAuth.tsx`) and profile sheet (`CustomerProfile.tsx`).
- **App icons/splash for Android/PWA**: `artifacts/kisan-direct/public/manifest.webmanifest` + `public/icons/*.png` (48–512px, incl. maskable-512.png), favicon-32.png, apple-touch-icon.png, all wired in `index.html`.
- **Delivery tracking**: `OrdersPage.tsx` now polls every 20s, shows a live toast when an order's status changes, and a step-by-step progress tracker per active order.

- **Real OTP/SMS**: `artifacts/api-server/src/otpService.ts` sends/verifies OTP via 2Factor.in for all real customer numbers; seller number `9999999999` is a fixed bypass (OTP `7089`), never sends SMS.

Still open before a real Play Store launch (see earlier audit): payment gateway integration, and wrapping the web app as a native package (e.g. Capacitor) to produce an AAB for submission.

## Gotchas

- **No environment variables needed** — all DB, storage, and OTP-provider credentials are hardcoded in `config.js` (root) and `artifacts/api-server/src/config.ts`. Do not move them to secrets/env vars.
- **Do NOT provision Replit's built-in database** — this project intentionally uses Supabase PostgreSQL
- **Do NOT use Replit Object Storage** — this project intentionally uses Supabase Storage
- PORT must be set for the API server — handled via the `API Server` workflow command
- After code changes to api-server, the dev script re-runs esbuild build automatically (takes ~1s)
- The workflow restart tool may time out (the build step takes ~15s); check logs to confirm it actually started
