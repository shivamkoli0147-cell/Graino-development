export const config = {
  DATABASE_URL: "postgresql://postgres.gnujbijlnynurmpacsoa:GrainoDevelopment12345@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres",
};

for (const [key, value] of Object.entries(config)) {
  process.env[key] = value;
}
