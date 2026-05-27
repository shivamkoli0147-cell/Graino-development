import "./config.js";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@workspace/db/schema";
import {
  villages, customers, products, varieties,
  productBenefits, varietyBenefits, orders, orderItems,
} from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[db] ❌  DATABASE_URL is not set. Check config.js in project root.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

export async function initDb() {
  await seedIfEmpty();
}

async function seedIfEmpty() {
  const [villageRow] = await db.select({ c: count() }).from(villages);
  if (villageRow.c === 0) {
    await db.insert(villages).values(
      ["Pichor","Bamori","Datia","Indergarh","Bhander","Dabra","Karera","Lahar","Mohna","Shivpuri"]
        .map(name => ({ name }))
    );
  }

  const [productRow] = await db.select({ c: count() }).from(products);
  if (productRow.c > 0) return;

  type ProductSeed = {
    name: string; nameEn: string; emoji: string; category: string;
    minKg: number; bgColor: string;
    varieties: { name: string; price: number; desc: string; shelf: string }[];
    benefits: string[]; disadvantages: string[];
  };

  const productSeeds: ProductSeed[] = [
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

  for (const p of productSeeds) {
    const [inserted] = await db.insert(products).values({
      name: p.name, nameEn: p.nameEn, emoji: p.emoji,
      category: p.category, minKg: p.minKg, bgColor: p.bgColor,
    }).returning({ id: products.id });
    const productId = inserted.id;

    for (const v of p.varieties) {
      await db.insert(varieties).values({
        productId, name: v.name, pricePerKg: v.price,
        description: v.desc, shelfLife: v.shelf, inStock: true,
      });
    }
    for (const b of p.benefits)
      await db.insert(productBenefits).values({ productId, benefitText: b, type: "benefit" });
    for (const d of p.disadvantages)
      await db.insert(productBenefits).values({ productId, benefitText: d, type: "disadvantage" });
  }

  const [existingCustomer] = await db.select().from(customers).where(eq(customers.phone, "9876543210"));
  let customerId: number;
  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const [newCustomer] = await db.insert(customers).values({
      name: "Ramesh Kumar", phone: "9876543210", village: "Pichor",
    }).returning({ id: customers.id });
    customerId = newCustomer.id;
  }

  const lokman = await db.select({ id: varieties.id }).from(varieties).where(eq(varieties.name, "Lokman")).limit(1);
  const desiChana = await db.select({ id: varieties.id }).from(varieties).where(eq(varieties.name, "देसी चना")).limit(1);
  const var1Id = lokman[0]?.id;
  const var2Id = desiChana[0]?.id;

  const d1 = new Date(); d1.setDate(d1.getDate() - 2);
  const d2 = new Date(); d2.setDate(d2.getDate() - 1);

  if (var1Id) {
    const [o1] = await db.insert(orders).values({
      customerId, village: "Pichor", address: "Near Shiv Mandir",
      deliverySlot: "morning", totalAmount: 2200, status: "delivered",
      paymentStatus: "paid", createdAt: d1,
    }).returning({ id: orders.id });
    await db.insert(orderItems).values({
      orderId: o1.id, varietyId: var1Id, productName: "गेहूं",
      varietyName: "Lokman", pricePerKg: 22, quantityKg: 100,
    });
  }

  if (var2Id) {
    const [o2] = await db.insert(orders).values({
      customerId, village: "Pichor", address: "Near Shiv Mandir",
      deliverySlot: "afternoon", totalAmount: 1625, status: "accepted",
      paymentStatus: "pending", createdAt: d2,
    }).returning({ id: orders.id });
    await db.insert(orderItems).values({
      orderId: o2.id, varietyId: var2Id, productName: "चना",
      varietyName: "देसी चना", pricePerKg: 65, quantityKg: 25,
    });
  }
}
