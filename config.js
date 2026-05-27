// ─────────────────────────────────────────────────────────────────────────────
// config.js — Single source of truth for all project secrets and config.
// All modules load from here. Never store secrets anywhere else.
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  DATABASE_URL: "postgresql://postgres.gnujbijlnynurmpacsoa:GrainoDevelopment12345@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres",
};

// Inject into process.env so existing code that reads process.env.DATABASE_URL works
for (const [key, value] of Object.entries(config)) {
  process.env[key] = value;
}
