import pg from "pg";
const { Client } = pg;

const DB_URL = "postgresql://postgres.gnujbijlnynurmpacsoa:GrainoDevelopment12345@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

const client = new Client({ connectionString: DB_URL });
await client.connect();

await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP`);
console.log("✓ delivered_at column added to orders");

await client.end();
console.log("✅ Migration complete");
