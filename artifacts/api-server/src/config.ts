// ─────────────────────────────────────────────────────────────────────────────
// config.ts — Single source of truth for all project secrets and config.
// Loaded first before any DB or route code runs.
// ─────────────────────────────────────────────────────────────────────────────

export const DATABASE_URL =
  "postgresql://postgres.gnujbijlnynurmpacsoa:GrainoDevelopment12345@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

// Inject into process.env so any library reading process.env.DATABASE_URL works
process.env.DATABASE_URL = DATABASE_URL;
