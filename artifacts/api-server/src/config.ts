// ─────────────────────────────────────────────────────────────────────────────
// config.ts — Single source of truth for all project secrets and config.
// Loaded first before any DB or route code runs.
// ─────────────────────────────────────────────────────────────────────────────

export const DATABASE_URL =
  "postgresql://postgres.gnujbijlnynurmpacsoa:GrainoDevelopment12345@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

// Supabase project config (for storage bucket)
export const SUPABASE_URL = "https://gnujbijlnynurmpacsoa.supabase.co";
export const SUPABASE_SERVICE_ROLE_KEY = "ADD_YOUR_SERVICE_ROLE_KEY_HERE"; // Replace with real key from Supabase dashboard → Settings → API
export const SUPABASE_STORAGE_BUCKET = "product-images";

// Inject into process.env so any library reading process.env.DATABASE_URL works
process.env.DATABASE_URL = DATABASE_URL;
