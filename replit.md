# KisanDirect

A full-stack mobile-first agriculture selling web app for Rohit Mukati (single seller) serving 8–10 villages in rural Madhya Pradesh, India. Two modes: Customer App and Seller Dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080, auto-builds on start)
- `pnpm --filter @workspace/kisan-direct run dev` — Frontend (port 21034)
- `pnpm --filter @workspace/kisan-direct run typecheck` — TypeScript check for frontend
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API hooks and Zod schemas from OpenAPI spec
- Required env: none (uses SQLite, no external DB)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4, Baloo 2 font
- API: Express 5
- DB: Node.js built-in `node:sqlite` (no native compilation needed)
- API codegen: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- State: React state only (no external state library)

## Where things live

- `artifacts/api-server/src/db.ts` — SQLite DB init, schema, seed data (6 products, 10 villages)
- `artifacts/api-server/src/routes/kisanRoutes.ts` — All KisanDirect API routes
- `artifacts/kisan-direct/src/App.tsx` — Main app with customer/seller mode toggle
- `artifacts/kisan-direct/src/pages/` — All page components (Customer + Seller)
- `artifacts/kisan-direct/src/lib/utils.ts` — Cart types, session helpers, formatINR
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks

## Architecture decisions

- Uses Node.js 24 built-in `node:sqlite` instead of `better-sqlite3` (avoids Python/node-gyp native compilation issues in NixOS)
- Single-page React app with mode toggle button (Customer ↔ Seller) — no URL routing needed for this simple use case
- Cart state in React (App.tsx) using plain objects keyed by `productId-varietyId`
- Customer session in localStorage, seller session in sessionStorage
- OTP auth is mocked (any 4-digit OTP works for customers; seller uses phone 9999999999 / OTP 1234)
- DB file at workspace root: `kisandirect.db`

## Product

- **Customer App**: Login with phone+village+OTP → Browse 6 products with multiple varieties → Add to cart with kg-based quantity → Place orders → Track order status → Request returns
- **Seller Dashboard**: Login (Rohit Mukati) → View today's earnings & new orders → Manage all orders (accept/dispatch/deliver/cancel) → Toggle product variety stock on/off

## User preferences

- Hindi text throughout the customer-facing UI
- Max-width 390px centered, dark green (#1a3d1a) outer background
- Baloo 2 Google font
- 10 delivery villages: Pichor, Bamori, Datia, Indergarh, Bhander, Dabra, Karera, Lahar, Mohna, Shivpuri
- Seller: Rohit Mukati

## Gotchas

- **PORT must be set** for the API server — handled via `artifact.toml` `[services.development.env]` section
- **node:sqlite** requires `--experimental-sqlite` flag (included in package.json start script)
- After code changes to api-server, the dev script re-runs esbuild build automatically (takes ~1s)
- DB is seeded on first startup — delete `kisandirect.db` to reset
- The workflow restart tool may time out (the build step takes ~15s); check logs to confirm it actually started
