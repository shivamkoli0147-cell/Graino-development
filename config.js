// config.js — DATABASE_URL and other secrets are set by Replit automatically.
// This file is kept for import compatibility but no longer hardcodes any credentials.
if (!process.env.DATABASE_URL) {
  console.error("[config] ❌  DATABASE_URL is not set. Ensure Replit PostgreSQL is provisioned.");
  process.exit(1);
}
