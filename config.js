export const config = {
  DATABASE_URL: process.env.DATABASE_URL,
};

for (const [key, value] of Object.entries(config)) {
  if (value !== undefined) {
    process.env[key] = value;
  }
}
