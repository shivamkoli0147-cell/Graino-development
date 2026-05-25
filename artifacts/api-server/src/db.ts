// @ts-ignore — node:sqlite is experimental in Node 24, types may lag
import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../kisandirect.db");

export const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS villages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      village TEXT NOT NULL,
      address TEXT,
      lat REAL,
      lng REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT NOT NULL,
      emoji TEXT NOT NULL,
      category TEXT NOT NULL,
      min_kg INTEGER NOT NULL DEFAULT 10,
      bg_color TEXT NOT NULL DEFAULT 'linear-gradient(135deg,#e8f5e8,#d1fae5)',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS varieties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price_per_kg REAL NOT NULL,
      description TEXT,
      shelf_life TEXT,
      in_stock INTEGER NOT NULL DEFAULT 1,
      stock_level TEXT DEFAULT 'High'
    );

    CREATE TABLE IF NOT EXISTS product_benefits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      benefit_text TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'benefit'
    );

    CREATE TABLE IF NOT EXISTS variety_benefits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variety_id INTEGER NOT NULL REFERENCES varieties(id) ON DELETE CASCADE,
      benefit_text TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'benefit'
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      village TEXT NOT NULL,
      address TEXT,
      delivery_slot TEXT,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'placed',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      return_requested INTEGER NOT NULL DEFAULT 0,
      return_note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      variety_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      variety_name TEXT NOT NULL,
      price_per_kg REAL NOT NULL,
      quantity_kg REAL NOT NULL
    );
  `);

  // Migrations for existing DBs
  const migrations = [
    "ALTER TABLE product_benefits ADD COLUMN type TEXT NOT NULL DEFAULT 'benefit'",
    "ALTER TABLE customers ADD COLUMN address TEXT",
    "ALTER TABLE customers ADD COLUMN lat REAL",
    "ALTER TABLE customers ADD COLUMN lng REAL",
    "ALTER TABLE orders ADD COLUMN delivery_slot TEXT",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }

  // Fix ⚠️ entries that should be disadvantages
  db.exec("UPDATE product_benefits SET type='disadvantage' WHERE benefit_text LIKE '⚠️%' AND type='benefit'");

  seedIfEmpty();
}

function seedIfEmpty() {
  const villageCount = (db.prepare("SELECT COUNT(*) as c FROM villages").get() as { c: number }).c;
  if (villageCount === 0) {
    for (const v of ["Pichor","Bamori","Datia","Indergarh","Bhander","Dabra","Karera","Lahar","Mohna","Shivpuri"])
      db.prepare("INSERT INTO villages (name) VALUES (?)").run(v);
  }

  const productCount = (db.prepare("SELECT COUNT(*) as c FROM products").get() as { c: number }).c;
  if (productCount > 0) return;

  type ProductSeed = {
    name: string; nameEn: string; emoji: string; category: string; minKg: number; bgColor: string;
    varieties: { name: string; price: number; desc: string; shelf: string }[];
    benefits: string[]; disadvantages: string[];
  };

  const products: ProductSeed[] = [
    {
      name: "गेहूं", nameEn: "Wheat", emoji: "🌾", category: "अनाज", minKg: 50,
      bgColor: "linear-gradient(135deg,#fef9c3,#fef3c7)",
      varieties: [
        { name: "Lokman", price: 22, desc: "सबसे लोकप्रिय किस्म, रोटी के लिए बेस्ट", shelf: "2 साल" },
        { name: "Sona Moti", price: 24, desc: "चमकीला दाना, बाजार में ज्यादा demand", shelf: "18 महीने" },
        { name: "Farwati", price: 20, desc: "पुरानी देसी किस्म, ज्यादा पोषण", shelf: "2+ साल" },
        { name: "PBW-343", price: 23, desc: "उत्तर भारत की पसंद, अच्छी yield", shelf: "2 साल" },
      ],
      benefits: ["💪 प्रोटीन से भरपूर","🫀 दिल के लिए अच्छा","⚡ ऊर्जा देता है","🦴 हड्डियाँ मजबूत"],
      disadvantages: ["⚠️ ज्यादा खाने से मोटापा","⚠️ Gluten sensitivity वालों के लिए नुकसानदेह"],
    },
    {
      name: "मूंग दाल", nameEn: "Moong Dal", emoji: "🟢", category: "दालें", minKg: 10,
      bgColor: "linear-gradient(135deg,#dcfce7,#d1fae5)",
      varieties: [
        { name: "हरी मूंग", price: 85, desc: "खाने में स्वादिष्ट, जल्दी पचती है", shelf: "1 साल" },
        { name: "पीली मूंग", price: 90, desc: "दाल के लिए बेस्ट, मुलायम होती है", shelf: "1 साल" },
        { name: "धुली मूंग", price: 95, desc: "छिलका उतरी हुई, खिचड़ी के लिए", shelf: "8 महीने" },
      ],
      benefits: ["🌱 हल्की और digestible","🧠 दिमाग तेज करे","🩸 खून बढ़ाए","🤸 वजन कम करे"],
      disadvantages: ["⚠️ गैस हो सकती है"],
    },
    {
      name: "चना", nameEn: "Chana", emoji: "🟡", category: "दालें", minKg: 25,
      bgColor: "linear-gradient(135deg,#fef9c3,#fffbeb)",
      varieties: [
        { name: "देसी चना", price: 65, desc: "छोटा दाना, ज्यादा पोषण वाला", shelf: "2 साल" },
        { name: "काबुली चना", price: 80, desc: "बड़ा दाना, छोले के लिए परफेक्ट", shelf: "18 महीने" },
        { name: "हरा चना", price: 55, desc: "ताजा हरा, सब्जी बनाने के लिए", shelf: "6 महीने" },
      ],
      benefits: ["💪 प्रोटीन का राजा","🦷 दाँत मजबूत करे","🩺 शुगर control","⚖️ वजन संतुलित"],
      disadvantages: ["⚠️ पाचन में भारी हो सकता है"],
    },
    {
      name: "मूंगफली", nameEn: "Moongfali", emoji: "🥜", category: "तिलहन", minKg: 10,
      bgColor: "linear-gradient(135deg,#fee2e2,#fef2f2)",
      varieties: [
        { name: "J-11", price: 55, desc: "सबसे ज्यादा बिकने वाली किस्म", shelf: "1 साल" },
        { name: "R-9", price: 58, desc: "तेल निकालने के लिए बेस्ट", shelf: "1 साल" },
        { name: "Bold", price: 62, desc: "बड़े दाने, snacking के लिए", shelf: "8 महीने" },
      ],
      benefits: ["🧠 Brain food","❤️ दिल को ताकत","🦴 कैल्शियम","💊 Vitamin E"],
      disadvantages: ["⚠️ Allergy हो सकती है","⚠️ ज्यादा खाने से वजन बढ़े"],
    },
    {
      name: "मक्का", nameEn: "Maize", emoji: "🌽", category: "अनाज", minKg: 50,
      bgColor: "linear-gradient(135deg,#fef9c3,#fde68a)",
      varieties: [
        { name: "Hybrid-123", price: 18, desc: "ज्यादा पैदावार, पशु आहार के लिए", shelf: "2 साल" },
        { name: "देसी मक्का", price: 22, desc: "खाने में मीठा, रोटी भी बनती है", shelf: "18 महीने" },
      ],
      benefits: ["⚡ Energy boost","👁️ आँखें तेज","🌿 Fiber भरपूर","🦷 मसूड़े मजबूत"],
      disadvantages: ["⚠️ High glycemic index"],
    },
    {
      name: "मेथी दाना", nameEn: "Fenugreek", emoji: "🌿", category: "मसाले", minKg: 5,
      bgColor: "linear-gradient(135deg,#d1fae5,#a7f3d0)",
      varieties: [
        { name: "देसी", price: 75, desc: "घरेलू नुस्खों में उपयोगी", shelf: "2 साल" },
        { name: "Kasuri", price: 120, desc: "खाने में खुशबू के लिए", shelf: "1 साल" },
      ],
      benefits: ["🩺 शुगर में फायदेमंद","🦵 जोड़ों का दर्द","💇 बाल काले रखे","🍽️ पाचन सुधारे"],
      disadvantages: ["⚠️ गर्भवती महिलाओं के लिए सावधानी"],
    },
  ];

  for (const p of products) {
    const r = db.prepare(
      "INSERT INTO products (name, name_en, emoji, category, min_kg, bg_color) VALUES (?,?,?,?,?,?)"
    ).run(p.name, p.nameEn, p.emoji, p.category, p.minKg, p.bgColor);
    const productId = r.lastInsertRowid as number;
    for (const v of p.varieties)
      db.prepare("INSERT INTO varieties (product_id, name, price_per_kg, description, shelf_life, in_stock) VALUES (?,?,?,?,?,1)")
        .run(productId, v.name, v.price, v.desc, v.shelf);
    for (const b of p.benefits)
      db.prepare("INSERT INTO product_benefits (product_id, benefit_text, type) VALUES (?,?,'benefit')").run(productId, b);
    for (const d of p.disadvantages)
      db.prepare("INSERT INTO product_benefits (product_id, benefit_text, type) VALUES (?,?,'disadvantage')").run(productId, d);
  }

  db.prepare("INSERT OR IGNORE INTO customers (name, phone, village) VALUES (?,?,?)").run("Ramesh Kumar","9876543210","Pichor");
  const customerId = (db.prepare("SELECT id FROM customers WHERE phone = ?").get("9876543210") as { id: number }).id;
  const var1Id = (db.prepare("SELECT id FROM varieties WHERE name = ?").get("Lokman") as { id: number }).id;
  const var2Id = (db.prepare("SELECT id FROM varieties WHERE name = ?").get("देसी चना") as { id: number }).id;

  const d1 = new Date(); d1.setDate(d1.getDate() - 2);
  const d2 = new Date(); d2.setDate(d2.getDate() - 1);
  const fmt = (d: Date) => d.toISOString().replace("T"," ").slice(0,19);

  const o1 = db.prepare("INSERT INTO orders (customer_id,village,address,delivery_slot,total_amount,status,payment_status,created_at) VALUES (?,?,?,?,?,?,?,?)")
    .run(customerId,"Pichor","Near Shiv Mandir","morning",2200,"delivered","paid",fmt(d1));
  db.prepare("INSERT INTO order_items (order_id,variety_id,product_name,variety_name,price_per_kg,quantity_kg) VALUES (?,?,?,?,?,?)")
    .run(o1.lastInsertRowid, var1Id, "गेहूं", "Lokman", 22, 100);

  const o2 = db.prepare("INSERT INTO orders (customer_id,village,address,delivery_slot,total_amount,status,payment_status,created_at) VALUES (?,?,?,?,?,?,?,?)")
    .run(customerId,"Pichor","Near Shiv Mandir","afternoon",1625,"accepted","pending",fmt(d2));
  db.prepare("INSERT INTO order_items (order_id,variety_id,product_name,variety_name,price_per_kg,quantity_kg) VALUES (?,?,?,?,?,?)")
    .run(o2.lastInsertRowid, var2Id, "चना", "देसी चना", 65, 25);
}
