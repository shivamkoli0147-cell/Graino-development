// config.ts — loads environment variables. DATABASE_URL is set by Replit automatically.

if (!process.env.DATABASE_URL) {
  console.error("[config] ❌  DATABASE_URL is not set.");
  process.exit(1);
}
