import { Router } from "express";
import { db } from "../db.js";

const router = Router();

const ALLOWED_VILLAGES = ["Pichor","Bamori","Datia","Indergarh","Bhander","Dabra","Karera","Lahar","Mohna","Shivpuri"];

// ── helpers ──────────────────────────────────────────────────────────────────
type Row = Record<string, unknown>;
type BenefitRow = { id: number; benefit_text: string; type: string };

function getVarietyBenefits(varietyId: number) {
  const rows = db.prepare("SELECT * FROM variety_benefits WHERE variety_id = ?").all(varietyId) as BenefitRow[];
  return {
    benefits: rows.filter(b => b.type === "benefit").map(b => ({ id: b.id, text: b.benefit_text })),
    disadvantages: rows.filter(b => b.type === "disadvantage").map(b => ({ id: b.id, text: b.benefit_text })),
  };
}

function getProductWithDetails(id: number) {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as Row | undefined;
  if (!product) return null;
  const varieties = (db.prepare("SELECT * FROM varieties WHERE product_id = ? ORDER BY id").all(id) as Row[]).map(v => {
    const vb = getVarietyBenefits(v.id as number);
    return { ...v, in_stock: v.in_stock === 1, ...vb };
  });
  const pBenefits = db.prepare("SELECT * FROM product_benefits WHERE product_id = ?").all(id) as BenefitRow[];
  return {
    ...product, varieties,
    benefits: pBenefits.filter(b => b.type === "benefit").map(b => ({ id: b.id, text: b.benefit_text })),
    disadvantages: pBenefits.filter(b => b.type === "disadvantage").map(b => ({ id: b.id, text: b.benefit_text })),
  };
}

function getAllProductsWithDetails(category?: string, search?: string) {
  let query = "SELECT * FROM products";
  const params: (string | number)[] = [];
  const conditions: string[] = [];
  if (category && category !== "सब") { conditions.push("category = ?"); params.push(category); }
  if (search) { conditions.push("(name LIKE ? OR name_en LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  if (conditions.length) query += " WHERE " + conditions.join(" AND ");
  query += " ORDER BY id ASC";
  return (db.prepare(query).all(...params) as Row[]).map(p => {
    const varieties = (db.prepare("SELECT * FROM varieties WHERE product_id = ? ORDER BY id").all(p.id as number) as Row[]).map(v => {
      const vb = getVarietyBenefits(v.id as number);
      return { ...v, in_stock: v.in_stock === 1, ...vb };
    });
    const pBenefits = db.prepare("SELECT * FROM product_benefits WHERE product_id = ?").all(p.id as number) as BenefitRow[];
    return {
      ...p, varieties,
      benefits: pBenefits.filter(b => b.type === "benefit").map(b => ({ id: b.id, text: b.benefit_text })),
      disadvantages: pBenefits.filter(b => b.type === "disadvantage").map(b => ({ id: b.id, text: b.benefit_text })),
    };
  });
}

function getOrderWithDetails(orderId: number) {
  const order = db.prepare(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone,
           c.lat as customer_lat, c.lng as customer_lng
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = ?
  `).get(orderId) as Row | undefined;
  if (!order) return null;
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId);
  return { ...order, return_requested: order.return_requested === 1, items };
}

type VarietyInput = {
  id?: number;
  name: string; price_per_kg: number; description?: string; shelf_life?: string;
  in_stock?: boolean; stock_level?: string;
  benefits?: { text: string }[];
  disadvantages?: { text: string }[];
};

function saveVarieties(productId: number, varieties: VarietyInput[]) {
  const existingIds = new Set(
    (db.prepare("SELECT id FROM varieties WHERE product_id = ?").all(productId) as { id: number }[]).map(r => r.id)
  );
  const keptIds = new Set<number>();
  for (const v of varieties) {
    if (v.id && existingIds.has(v.id)) {
      db.prepare("UPDATE varieties SET name=?,price_per_kg=?,description=?,shelf_life=?,in_stock=?,stock_level=? WHERE id=?")
        .run(v.name, v.price_per_kg, v.description || null, v.shelf_life || null,
          v.in_stock !== false ? 1 : 0, v.stock_level || (v.in_stock !== false ? "High" : "Out of Stock"), v.id);
      db.prepare("DELETE FROM variety_benefits WHERE variety_id = ?").run(v.id);
      for (const b of (v.benefits || [])) db.prepare("INSERT INTO variety_benefits (variety_id, benefit_text, type) VALUES (?,?,'benefit')").run(v.id, b.text);
      for (const d of (v.disadvantages || [])) db.prepare("INSERT INTO variety_benefits (variety_id, benefit_text, type) VALUES (?,?,'disadvantage')").run(v.id, d.text);
      keptIds.add(v.id);
    } else {
      const r = db.prepare("INSERT INTO varieties (product_id,name,price_per_kg,description,shelf_life,in_stock,stock_level) VALUES (?,?,?,?,?,?,?)")
        .run(productId, v.name, v.price_per_kg, v.description || null, v.shelf_life || null, v.in_stock !== false ? 1 : 0, v.stock_level || "High");
      const newId = r.lastInsertRowid as number;
      for (const b of (v.benefits || [])) db.prepare("INSERT INTO variety_benefits (variety_id, benefit_text, type) VALUES (?,?,'benefit')").run(newId, b.text);
      for (const d of (v.disadvantages || [])) db.prepare("INSERT INTO variety_benefits (variety_id, benefit_text, type) VALUES (?,?,'disadvantage')").run(newId, d.text);
      keptIds.add(newId);
    }
  }
  for (const id of existingIds) {
    if (!keptIds.has(id)) db.prepare("DELETE FROM varieties WHERE id = ?").run(id);
  }
}

// ── Villages ──────────────────────────────────────────────────────────────────
router.get("/villages", (_req, res) => {
  res.json(db.prepare("SELECT * FROM villages ORDER BY id").all());
});

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/auth/customer", (req, res) => {
  const { phone, otp, name, village, address, lat, lng } = req.body as {
    phone: string; otp: string; name: string; village: string;
    address?: string; lat?: number; lng?: number;
  };
  if (!phone || !otp || !name || !village) { res.status(400).json({ error: "All fields required" }); return; }
  if (!ALLOWED_VILLAGES.includes(village)) { res.status(400).json({ error: "इस village में delivery नहीं होती" }); return; }
  if (!/^\d{4}$/.test(otp)) { res.status(400).json({ error: "OTP must be 4 digits" }); return; }
  const existing = db.prepare("SELECT * FROM customers WHERE phone = ?").get(phone) as Row | undefined;
  if (existing) {
    db.prepare("UPDATE customers SET name=?,village=?,address=COALESCE(?,address),lat=COALESCE(?,lat),lng=COALESCE(?,lng) WHERE phone=?")
      .run(name, village, address || null, lat || null, lng || null, phone);
    res.json({ success: true, customer: db.prepare("SELECT * FROM customers WHERE phone = ?").get(phone) });
    return;
  }
  const r = db.prepare("INSERT INTO customers (name,phone,village,address,lat,lng) VALUES (?,?,?,?,?,?)").run(name, phone, village, address || null, lat || null, lng || null);
  res.json({ success: true, customer: db.prepare("SELECT * FROM customers WHERE id = ?").get(r.lastInsertRowid) });
});

router.post("/auth/seller", (req, res) => {
  const { phone, otp } = req.body as { phone: string; otp: string };
  if (phone === "9999999999" && otp === "1234") res.json({ success: true, message: "Seller login successful" });
  else res.status(401).json({ success: false, message: "गलत credentials" });
});

// ── Customer profile update ───────────────────────────────────────────────────
router.put("/customers/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { name, address, lat, lng } = req.body as { name?: string; address?: string; lat?: number; lng?: number };
  const existing = db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as Row | undefined;
  if (!existing) { res.status(404).json({ error: "Customer not found" }); return; }
  db.prepare("UPDATE customers SET name=COALESCE(?,name), address=COALESCE(?,address), lat=COALESCE(?,lat), lng=COALESCE(?,lng) WHERE id=?")
    .run(name || null, address || null, lat || null, lng || null, id);
  res.json(db.prepare("SELECT * FROM customers WHERE id = ?").get(id));
});

// ── Products ──────────────────────────────────────────────────────────────────
router.get("/products", (req, res) => {
  const { category, search } = req.query as { category?: string; search?: string };
  res.json(getAllProductsWithDetails(category, search));
});

router.get("/products/:id", (req, res) => {
  const product = getProductWithDetails(parseInt(req.params.id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(product);
});

router.post("/products", (req, res) => {
  const { name, name_en, emoji, category, min_kg, bg_color,
    varieties = [], benefits = [], disadvantages = [] } = req.body as {
    name: string; name_en: string; emoji: string; category: string;
    min_kg?: number; bg_color?: string;
    varieties?: VarietyInput[];
    benefits?: string[];
    disadvantages?: string[];
  };
  if (!name || !name_en || !emoji || !category) { res.status(400).json({ error: "Required fields missing" }); return; }
  const r = db.prepare("INSERT INTO products (name,name_en,emoji,category,min_kg,bg_color) VALUES (?,?,?,?,?,?)")
    .run(name, name_en, emoji, category, min_kg || 10, bg_color || "linear-gradient(135deg,#e8f5e8,#d1fae5)");
  const productId = r.lastInsertRowid as number;
  for (const v of varieties) {
    const vr = db.prepare("INSERT INTO varieties (product_id,name,price_per_kg,description,shelf_life,in_stock) VALUES (?,?,?,?,?,?)")
      .run(productId, v.name, v.price_per_kg, v.description || null, v.shelf_life || null, v.in_stock !== false ? 1 : 0);
    const vid = vr.lastInsertRowid as number;
    for (const b of (v.benefits || [])) db.prepare("INSERT INTO variety_benefits (variety_id, benefit_text, type) VALUES (?,?,'benefit')").run(vid, b.text || b);
    for (const d of (v.disadvantages || [])) db.prepare("INSERT INTO variety_benefits (variety_id, benefit_text, type) VALUES (?,?,'disadvantage')").run(vid, d.text || d);
  }
  for (const b of benefits as string[]) db.prepare("INSERT INTO product_benefits (product_id, benefit_text, type) VALUES (?,?,'benefit')").run(productId, b);
  for (const d of disadvantages as string[]) db.prepare("INSERT INTO product_benefits (product_id, benefit_text, type) VALUES (?,?,'disadvantage')").run(productId, d);
  res.status(201).json(getProductWithDetails(productId));
});

router.put("/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { name, name_en, emoji, category, min_kg, bg_color,
    varieties = [], benefits = [], disadvantages = [] } = req.body as {
    name: string; name_en: string; emoji: string; category: string;
    min_kg?: number; bg_color?: string;
    varieties?: VarietyInput[];
    benefits?: string[];
    disadvantages?: string[];
  };
  if (!db.prepare("SELECT id FROM products WHERE id = ?").get(id)) { res.status(404).json({ error: "Not found" }); return; }
  db.prepare("UPDATE products SET name=?,name_en=?,emoji=?,category=?,min_kg=?,bg_color=? WHERE id=?")
    .run(name, name_en, emoji, category, min_kg || 10, bg_color || "linear-gradient(135deg,#e8f5e8,#d1fae5)", id);
  db.prepare("DELETE FROM product_benefits WHERE product_id = ?").run(id);
  for (const b of benefits as string[]) db.prepare("INSERT INTO product_benefits (product_id, benefit_text, type) VALUES (?,?,'benefit')").run(id, b);
  for (const d of disadvantages as string[]) db.prepare("INSERT INTO product_benefits (product_id, benefit_text, type) VALUES (?,?,'disadvantage')").run(id, d);
  saveVarieties(id, varieties);
  res.json(getProductWithDetails(id));
});

router.delete("/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (!db.prepare("SELECT id FROM products WHERE id = ?").get(id)) { res.status(404).json({ error: "Not found" }); return; }
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
  res.json({ success: true });
});

router.patch("/products/:id/varieties/:varietyId/stock", (req, res) => {
  const varietyId = parseInt(req.params.varietyId);
  const { in_stock, stock_level } = req.body as { in_stock: boolean; stock_level?: string };
  const existing = db.prepare("SELECT * FROM varieties WHERE id = ?").get(varietyId) as Row | undefined;
  if (!existing) { res.status(404).json({ error: "Variety not found" }); return; }
  db.prepare("UPDATE varieties SET in_stock=?,stock_level=? WHERE id=?")
    .run(in_stock ? 1 : 0, stock_level || (in_stock ? "High" : "Out of Stock"), varietyId);
  const updated = db.prepare("SELECT * FROM varieties WHERE id = ?").get(varietyId) as Row;
  res.json({ ...updated, in_stock: updated.in_stock === 1 });
});

router.delete("/products/:id/varieties/:varietyId", (req, res) => {
  const varietyId = parseInt(req.params.varietyId);
  const productId = parseInt(req.params.id);
  const existing = db.prepare("SELECT * FROM varieties WHERE id = ? AND product_id = ?").get(varietyId, productId);
  if (!existing) { res.status(404).json({ error: "Variety not found" }); return; }
  db.prepare("DELETE FROM varieties WHERE id = ?").run(varietyId);
  res.json({ success: true });
});

// ── Orders ────────────────────────────────────────────────────────────────────
router.get("/orders", (req, res) => {
  const { phone, status, slot } = req.query as { phone?: string; status?: string; slot?: string };
  let query = `SELECT o.*,c.name as customer_name,c.phone as customer_phone,
    c.lat as customer_lat,c.lng as customer_lng
    FROM orders o LEFT JOIN customers c ON o.customer_id=c.id`;
  const params: (string | number)[] = [];
  const conditions: string[] = [];
  if (phone) { conditions.push("c.phone = ?"); params.push(phone); }
  if (status && status !== "all") { conditions.push("o.status = ?"); params.push(status); }
  if (slot && slot !== "all") { conditions.push("o.delivery_slot = ?"); params.push(slot); }
  if (conditions.length) query += " WHERE " + conditions.join(" AND ");
  query += " ORDER BY o.created_at DESC";
  const orders = (db.prepare(query).all(...params) as Row[]).map(o => ({
    ...o, return_requested: o.return_requested === 1,
    items: db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(o.id as number),
  }));
  res.json(orders);
});

router.post("/orders", (req, res) => {
  const { customer_id, village, address, delivery_slot, items = [] } = req.body as {
    customer_id: number; village: string; address?: string; delivery_slot?: string;
    items: { variety_id: number; product_name: string; variety_name: string; price_per_kg: number; quantity_kg: number }[]
  };
  if (!customer_id || !village || !items.length) { res.status(400).json({ error: "Required fields missing" }); return; }
  if (!ALLOWED_VILLAGES.includes(village)) { res.status(400).json({ error: "Delivery not available here" }); return; }
  const total = items.reduce((s, i) => s + i.price_per_kg * i.quantity_kg, 0);
  const r = db.prepare("INSERT INTO orders (customer_id,village,address,delivery_slot,total_amount,status,payment_status) VALUES (?,?,?,?,?,?,?)")
    .run(customer_id, village, address || null, delivery_slot || null, total, "placed", "pending");
  const orderId = r.lastInsertRowid as number;
  for (const item of items)
    db.prepare("INSERT INTO order_items (order_id,variety_id,product_name,variety_name,price_per_kg,quantity_kg) VALUES (?,?,?,?,?,?)")
      .run(orderId, item.variety_id, item.product_name, item.variety_name, item.price_per_kg, item.quantity_kg);
  res.status(201).json(getOrderWithDetails(orderId));
});

router.patch("/orders/:id/status", (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body as { status: string };
  const valid = ["placed","accepted","out_for_delivery","delivered","cancelled"];
  if (!valid.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  if (!db.prepare("SELECT id FROM orders WHERE id = ?").get(id)) { res.status(404).json({ error: "Not found" }); return; }
  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
  res.json(getOrderWithDetails(id));
});

router.post("/orders/:id/return", (req, res) => {
  const id = parseInt(req.params.id);
  const { note } = req.body as { note: string };
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Row | undefined;
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.status !== "delivered") { res.status(400).json({ error: "Only delivered orders can be returned" }); return; }
  db.prepare("UPDATE orders SET return_requested=1, return_note=? WHERE id=?").run(note || "Return requested", id);
  res.json(getOrderWithDetails(id));
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/dashboard/stats", (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const newOrders = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='placed'").get() as { c: number }).c;
  const todayEarnings = (db.prepare(`SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE date(created_at)=? AND status IN ('accepted','out_for_delivery','delivered')`).get(today) as { total: number }).total;
  const totalOrdersToday = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE date(created_at)=?").get(today) as { c: number }).c;
  const villagesServed = (db.prepare("SELECT COUNT(DISTINCT village) as c FROM orders WHERE date(created_at)=?").get(today) as { c: number }).c;

  // Slot breakdown for today
  const slotBreakdown = db.prepare(`
    SELECT delivery_slot, COUNT(*) as count FROM orders
    WHERE date(created_at)=? AND status NOT IN ('cancelled')
    GROUP BY delivery_slot
  `).all(today) as { delivery_slot: string; count: number }[];

  const stockSummary = (db.prepare(`
    SELECT p.name as product_name,v.name as variety_name,v.in_stock,v.stock_level
    FROM varieties v JOIN products p ON v.product_id=p.id ORDER BY v.in_stock ASC,p.id ASC LIMIT 10
  `).all() as { product_name: string; variety_name: string; in_stock: number; stock_level: string }[])
    .map(s => ({ ...s, in_stock: s.in_stock === 1 }));

  res.json({
    new_orders: newOrders, today_earnings: todayEarnings,
    village_count: Math.max(villagesServed, ALLOWED_VILLAGES.length),
    total_orders_today: totalOrdersToday, low_stock_count: 0,
    stock_summary: stockSummary, slot_breakdown: slotBreakdown,
  });
});

export default router;
