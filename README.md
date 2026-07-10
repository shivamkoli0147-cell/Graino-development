# Graino (KisanDirect)

A full-stack, mobile-first agriculture selling web app for a single seller (Rohit Mukati) serving 8–10 villages in rural Madhya Pradesh, India. Two modes in one app: **Customer App** and **Seller Dashboard**.

> Detailed project notes, architecture decisions, and agent-specific instructions live in [`replit.md`](./replit.md). This README is the human-facing quick start.

---

## ⚠️ Non-negotiable project rules

- **Database & storage**: Supabase PostgreSQL + Supabase Storage only. Never switch to Replit's built-in database or Object Storage.
- **Credentials stay hardcoded**, not in environment variables or Replit Secrets:
  - Supabase DB URL, service role key, storage bucket — `config.js` (root) and `artifacts/api-server/src/config.ts`
  - 2Factor.in OTP API key — `artifacts/api-server/src/config.ts` (`TWOFACTOR_API_KEY`)

See `replit.md` for the full list of gotchas before making changes.

---

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- **Frontend**: React + Vite + Tailwind CSS v4, Baloo 2 font
- **API**: Express 5
- **Database**: Supabase PostgreSQL via Drizzle ORM
- **File storage**: Supabase Storage (`product-images` bucket)
- **OTP / SMS**: 2Factor.in (real SMS OTP for customers; fixed bypass for the seller login)
- **API codegen**: Orval, generated from `lib/api-spec/openapi.yaml`

## Run & operate

```bash
pnpm --filter @workspace/api-server run dev     # API server — port 8080
pnpm --filter @workspace/kisan-direct run dev   # Frontend — port 21034
pnpm --filter @workspace/kisan-direct run typecheck
pnpm --filter @workspace/api-spec run codegen   # Regenerate API hooks + Zod schemas
```

No environment variables are required — all credentials are hardcoded per the project rules above.

## Where things live

| Path | Purpose |
|---|---|
| `config.js` | Root config — hardcoded `DATABASE_URL` |
| `artifacts/api-server/src/config.ts` | Hardcoded Supabase DB URL, service role key, storage bucket, 2Factor OTP API key |
| `artifacts/api-server/src/db.ts` | Drizzle ORM setup |
| `artifacts/api-server/src/otpService.ts` | Real OTP send/verify via 2Factor.in, seller fixed-OTP bypass |
| `artifacts/api-server/src/routes/kisanRoutes.ts` | All API routes (auth, products, orders, villages, storage) |
| `artifacts/kisan-direct/src/App.tsx` | Main app, Customer ↔ Seller mode toggle |
| `artifacts/kisan-direct/src/pages/` | All page components |
| `lib/api-spec/openapi.yaml` | Source of truth for the API contract |
| `lib/api-client-react/src/generated/api.ts` | Generated React Query hooks |
| `lib/db/` | Drizzle schema + `drizzle.config.ts` |

## Product

- **Customer App**: Login with phone + village + real SMS OTP → browse products & varieties → cart by kg quantity → place orders → track delivery status → request returns.
- **Seller Dashboard**: Fixed login (phone `9999999999` / OTP `7089`, no SMS sent) → today's earnings & new orders → manage order lifecycle → toggle stock → manage product images.

## Auth / OTP

- Real customer numbers go through 2Factor.in SMS OTP (send + verify), 5-minute expiry, session store swept periodically.
- The seller number `9999999999` is a fixed bypass — always OTP `7089`, isolated from the real customer OTP flow, never calls the SMS provider.

## User preferences

- Hindi text throughout the customer-facing UI
- Max-width 390px centered layout, dark green (`#1a3d1a`) outer background
- 10 delivery villages: Pichor, Bamori, Datia, Indergarh, Bhander, Dabra, Karera, Lahar, Mohna, Shivpuri
