// ─────────────────────────────────────────────────────────────────────────────
// config.ts — Single source of truth for all project secrets and config.
// Loaded first before any DB or route code runs.
// ─────────────────────────────────────────────────────────────────────────────

export const DATABASE_URL =
  "postgresql://postgres.gnujbijlnynurmpacsoa:GrainoDevelopment12345@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

// Supabase project config (for storage bucket)
export const SUPABASE_URL = "https://gnujbijlnynurmpacsoa.supabase.co";
export const SUPABASE_SERVICE_ROLE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdudWpiaWpsbnludXJtcGFjc29hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg2MDU4MCwiZXhwIjoyMDk1NDM2NTgwfQ.PjePLoQT7og1WZpT6qGlJ0Q60RAKfF8n3Y2RBuaaipg"; // Replace with real key from Supabase dashboard → Settings → API
export const SUPABASE_STORAGE_BUCKET = "product-images";

// Inject into process.env so any library reading process.env.DATABASE_URL works
process.env.DATABASE_URL = DATABASE_URL;
