---
name: KisanDirect migration
description: Key decisions made when migrating KisanDirect from Supabase to Replit
---

# KisanDirect Migration

**Why:** Project was originally built with hardcoded Supabase credentials in `config.ts` and `config.js` (root). Migrated to Replit-native services.

## Key changes

- `config.js` (root) and `artifacts/api-server/src/config.ts`: removed hardcoded Supabase DB/storage credentials. Now just validates `DATABASE_URL` is set (Replit injects it automatically).
- `lib/db/drizzle.config.ts`: removed `import "../../config.js"` since DATABASE_URL is already in env.
- `artifacts/api-server/src/routes/kisanRoutes.ts`: replaced `uploadToSupabase` / `deleteFromSupabase` with `uploadBufferToObjectStorage` / `deleteFromObjectStorage` from Replit Object Storage helper.
- `artifacts/api-server/src/app.ts`: added `registerObjectStorageRoutes(app)` for presigned URL upload flow.
- Object storage helper at `artifacts/api-server/src/replit_integrations/object_storage/uploadHelper.ts`.
- DB tables created via `executeSql` (drizzle-kit push was connecting to stale Supabase URL before config was fixed).

## How to apply

- DATABASE_URL, PGHOST, etc. are auto-set by Replit — never hardcode them.
- Object storage bucket env vars: DEFAULT_OBJECT_STORAGE_BUCKET_ID, PUBLIC_OBJECT_SEARCH_PATHS, PRIVATE_OBJECT_DIR — set by Replit object storage setup.
- Express 5 route syntax: use `/objects/*objectPath` not `/objects/:objectPath(*)`.
