// ─────────────────────────────────────────────────────────────────────────────
// secrets.js  –  Single source of truth for all environment secrets
// Import this file once before anything else in your entry point.
// All secrets are read from process.env (set via Replit Secrets or .env).
// ─────────────────────────────────────────────────────────────────────────────

// DATABASE_URL is injected automatically by Replit Secrets.
// Add any other required keys to this array.
const REQUIRED = ["DATABASE_URL"];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[secrets] ❌  Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

console.log("[secrets] ✅  All required secrets loaded from environment");
