import pg from "pg";
const { Client } = pg;

const DB_URL = "postgresql://postgres.gnujbijlnynurmpacsoa:GrainoDevelopment12345@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

const client = new Client({ connectionString: DB_URL });
await client.connect();

// 1. Add return_status column
await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_status TEXT`);
console.log("✓ return_status column added");

// 2. Create product_ratings table
await client.query(`
  CREATE TABLE IF NOT EXISTS product_ratings (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )
`);
console.log("✓ product_ratings table created");

// 3. Seed dummy ratings only if empty
const { rows: existing } = await client.query(`SELECT COUNT(*) FROM product_ratings`);
if (parseInt(existing[0].count) === 0) {
  const { rows: prods } = await client.query(`SELECT id, name_en FROM products ORDER BY id`);
  const DUMMY = [
    // wheat
    { nameEn: "Wheat", name: "Ramesh Kumar", stars: 5, comment: "bahut acha gehun tha, ekdum saaf aur fresh", daysAgo: 3 },
    { nameEn: "Wheat", name: "Sunita Devi", stars: 4, comment: "quality theek thi, thoda late mila", daysAgo: 6 },
    { nameEn: "Wheat", name: "Mohan Lal", stars: 5, comment: "पहली बार order kiya, bahut satisfy hua 👍", daysAgo: 10 },
    // moong dal
    { nameEn: "Moong Dal", name: "Priya Bai", stars: 5, comment: "ekdum fresh dal thi, ghar wale khush ho gaye", daysAgo: 2 },
    { nameEn: "Moong Dal", name: "Govind Patel", stars: 4, comment: "achha maal hai bhai, agli baar bhi lunga", daysAgo: 8 },
    // chana
    { nameEn: "Chana", name: "Dinesh Sharma", stars: 5, comment: "original quality desi chana tha", daysAgo: 4 },
    { nameEn: "Chana", name: "Kamla Bai", stars: 3, comment: "thoda chota size tha, warna theek", daysAgo: 12 },
    { nameEn: "Chana", name: "Vijay Singh", stars: 4, comment: "fast delivery aayi aur packing bhi sahi thi", daysAgo: 7 },
    // moongfali
    { nameEn: "Moongfali", name: "Santosh Verma", stars: 5, comment: "bahut crispy aur fresh moongfali, family ne pasand ki", daysAgo: 5 },
    { nameEn: "Moongfali", name: "Lata Devi", stars: 4, comment: "sahi price me acchi quality mili", daysAgo: 9 },
    // maize
    { nameEn: "Maize", name: "Harish Yadav", stars: 5, comment: "desi makka tha, bahut tasty bana", daysAgo: 1 },
    { nameEn: "Maize", name: "Pushpa Bai", stars: 4, comment: "मक्का अच्छा था, timely delivery", daysAgo: 11 },
    // fenugreek
    { nameEn: "Fenugreek", name: "Rakesh Tiwari", stars: 5, comment: "shuddh methi thi, khushbu bhi acha tha", daysAgo: 6 },
    { nameEn: "Fenugreek", name: "Anita Rani", stars: 4, comment: "quality acha hai, price bhi sahi", daysAgo: 14 },
  ];

  for (const d of DUMMY) {
    const prod = prods.find(p => p.name_en === d.nameEn);
    if (!prod) continue;
    const createdAt = new Date(Date.now() - d.daysAgo * 86400000);
    await client.query(
      `INSERT INTO product_ratings (product_id, customer_name, stars, comment, created_at) VALUES ($1,$2,$3,$4,$5)`,
      [prod.id, d.name, d.stars, d.comment, createdAt]
    );
  }
  console.log(`✓ Seeded ${DUMMY.length} dummy ratings`);
} else {
  console.log("⏭ Ratings already exist, skipping seed");
}

await client.end();
console.log("✅ Migration complete");
