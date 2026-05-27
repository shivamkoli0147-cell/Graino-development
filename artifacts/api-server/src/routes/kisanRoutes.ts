import { Router } from "express";
import { db } from "../db.js";
import {
  villages, customers, products, varieties,
  productBenefits, varietyBenefits, orders, orderItems,
} from "@workspace/db/schema";
import { eq, and, ilike, or, sql, count, sum, countDistinct, asc, desc, inArray, ne } from "drizzle-orm";

const router = Router();

const ALLOWED_VILLAGES = ["Pichor","Bamori","Datia","Indergarh","Bhander","Dabra","Karera","Lahar","Mohna","Shivpuri"];

// ── helpers ──────────────────────────────────────────────────────────────────

async function getVarietyBenefitsData(varietyId: number) {
  const rows = await db.select().from(varietyBenefits).where(eq(varietyBenefits.varietyId, varietyId));
  return {
    benefits: rows.filter(b => b.type === "benefit").map(b => ({ id: b.id, text: b.benefitText })),
    disadvantages: rows.filter(b => b.type === "disadvantage").map(b => ({ id: b.id, text: b.benefitText })),
  };
}

async function getProductWithDetails(id: number) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return null;
  const vars = await db.select().from(varieties).where(eq(varieties.productId, id)).orderBy(asc(varieties.id));
  const varWithBenefits = await Promise.all(vars.map(async v => {
    const vb = await getVarietyBenefitsData(v.id);
    return { ...v, in_stock: v.inStock, ...vb };
  }));
  const pBenefits = await db.select().from(productBenefits).where(eq(productBenefits.productId, id));
  return {
    ...product,
    min_kg: product.minKg,
    name_en: product.nameEn,
    bg_color: product.bgColor,
    created_at: product.createdAt,
    varieties: varWithBenefits,
    benefits: pBenefits.filter(b => b.type === "benefit").map(b => ({ id: b.id, text: b.benefitText })),
    disadvantages: pBenefits.filter(b => b.type === "disadvantage").map(b => ({ id: b.id, text: b.benefitText })),
  };
}

async function getAllProductsWithDetails(category?: string, search?: string) {
  let query = db.select().from(products).$dynamic();
  const conditions = [];
  if (category && category !== "सब") conditions.push(eq(products.category, category));
  if (search) conditions.push(or(ilike(products.name, `%${search}%`), ilike(products.nameEn, `%${search}%`))!);
  if (conditions.length === 1) query = query.where(conditions[0]);
  else if (conditions.length > 1) query = query.where(and(...conditions));
  query = query.orderBy(asc(products.id));
  const rows = await query;
  return Promise.all(rows.map(async p => {
    const vars = await db.select().from(varieties).where(eq(varieties.productId, p.id)).orderBy(asc(varieties.id));
    const varWithBenefits = await Promise.all(vars.map(async v => {
      const vb = await getVarietyBenefitsData(v.id);
      return { ...v, in_stock: v.inStock, ...vb };
    }));
    const pBenefits = await db.select().from(productBenefits).where(eq(productBenefits.productId, p.id));
    return {
      ...p,
      min_kg: p.minKg,
      name_en: p.nameEn,
      bg_color: p.bgColor,
      created_at: p.createdAt,
      varieties: varWithBenefits,
      benefits: pBenefits.filter(b => b.type === "benefit").map(b => ({ id: b.id, text: b.benefitText })),
      disadvantages: pBenefits.filter(b => b.type === "disadvantage").map(b => ({ id: b.id, text: b.benefitText })),
    };
  }));
}

async function getOrderWithDetails(orderId: number) {
  const rows = await db
    .select({
      order: orders,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerLat: customers.lat,
      customerLng: customers.lng,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, orderId));
  if (!rows.length) return null;
  const { order, customerName, customerPhone, customerLat, customerLng } = rows[0];
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return {
    ...order,
    delivery_slot: order.deliverySlot,
    total_amount: order.totalAmount,
    payment_status: order.paymentStatus,
    return_requested: order.returnRequested,
    return_note: order.returnNote,
    created_at: order.createdAt,
    customer_id: order.customerId,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_lat: customerLat,
    customer_lng: customerLng,
    items: items.map(i => ({
      ...i,
      order_id: i.orderId,
      variety_id: i.varietyId,
      product_name: i.productName,
      variety_name: i.varietyName,
      price_per_kg: i.pricePerKg,
      quantity_kg: i.quantityKg,
    })),
  };
}

type VarietyInput = {
  id?: number;
  name: string; price_per_kg: number; description?: string; shelf_life?: string;
  in_stock?: boolean; stock_level?: string;
  benefits?: { text: string }[];
  disadvantages?: { text: string }[];
};

async function saveVarieties(productId: number, varietyInputs: VarietyInput[]) {
  const existingRows = await db.select({ id: varieties.id }).from(varieties).where(eq(varieties.productId, productId));
  const existingIds = new Set(existingRows.map(r => r.id));
  const keptIds = new Set<number>();

  for (const v of varietyInputs) {
    if (v.id && existingIds.has(v.id)) {
      await db.update(varieties).set({
        name: v.name,
        pricePerKg: v.price_per_kg,
        description: v.description || null,
        shelfLife: v.shelf_life || null,
        inStock: v.in_stock !== false,
        stockLevel: v.stock_level || (v.in_stock !== false ? "High" : "Out of Stock"),
      }).where(eq(varieties.id, v.id));
      await db.delete(varietyBenefits).where(eq(varietyBenefits.varietyId, v.id));
      for (const b of (v.benefits || []))
        await db.insert(varietyBenefits).values({ varietyId: v.id, benefitText: b.text, type: "benefit" });
      for (const d of (v.disadvantages || []))
        await db.insert(varietyBenefits).values({ varietyId: v.id, benefitText: d.text, type: "disadvantage" });
      keptIds.add(v.id);
    } else {
      const [inserted] = await db.insert(varieties).values({
        productId, name: v.name, pricePerKg: v.price_per_kg,
        description: v.description || null, shelfLife: v.shelf_life || null,
        inStock: v.in_stock !== false,
        stockLevel: v.stock_level || "High",
      }).returning({ id: varieties.id });
      const newId = inserted.id;
      for (const b of (v.benefits || []))
        await db.insert(varietyBenefits).values({ varietyId: newId, benefitText: b.text, type: "benefit" });
      for (const d of (v.disadvantages || []))
        await db.insert(varietyBenefits).values({ varietyId: newId, benefitText: d.text, type: "disadvantage" });
      keptIds.add(newId);
    }
  }

  for (const id of existingIds) {
    if (!keptIds.has(id)) await db.delete(varieties).where(eq(varieties.id, id));
  }
}

// ── Villages ──────────────────────────────────────────────────────────────────
router.get("/villages", async (_req, res) => {
  try {
    const rows = await db.select().from(villages).orderBy(asc(villages.id));
    res.json(rows);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/auth/customer", async (req, res) => {
  try {
    const { phone, otp, name, village, address, lat, lng } = req.body as {
      phone: string; otp: string; name: string; village: string;
      address?: string; lat?: number; lng?: number;
    };
    if (!phone || !otp || !name || !village) { res.status(400).json({ error: "All fields required" }); return; }
    if (!ALLOWED_VILLAGES.includes(village)) { res.status(400).json({ error: "इस village में delivery नहीं होती" }); return; }
    if (!/^\d{4}$/.test(otp)) { res.status(400).json({ error: "OTP must be 4 digits" }); return; }
    const [existing] = await db.select().from(customers).where(eq(customers.phone, phone));
    if (existing) {
      await db.update(customers).set({
        name, village,
        address: address || existing.address,
        lat: lat ?? existing.lat,
        lng: lng ?? existing.lng,
      }).where(eq(customers.phone, phone));
      const [updated] = await db.select().from(customers).where(eq(customers.phone, phone));
      res.json({ success: true, customer: updated });
      return;
    }
    const [inserted] = await db.insert(customers).values({
      name, phone, village, address: address || null, lat: lat ?? null, lng: lng ?? null,
    }).returning();
    res.json({ success: true, customer: inserted });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/auth/seller", (req, res) => {
  const { phone, otp } = req.body as { phone: string; otp: string };
  if (phone === "9999999999" && otp === "1234") res.json({ success: true, message: "Seller login successful" });
  else res.status(401).json({ success: false, message: "गलत credentials" });
});

// ── Customer profile update ───────────────────────────────────────────────────
router.put("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, address, lat, lng } = req.body as { name?: string; address?: string; lat?: number; lng?: number };
    const [existing] = await db.select().from(customers).where(eq(customers.id, id));
    if (!existing) { res.status(404).json({ error: "Customer not found" }); return; }
    await db.update(customers).set({
      name: name || existing.name,
      address: address || existing.address,
      lat: lat ?? existing.lat,
      lng: lng ?? existing.lng,
    }).where(eq(customers.id, id));
    const [updated] = await db.select().from(customers).where(eq(customers.id, id));
    res.json(updated);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Products ──────────────────────────────────────────────────────────────────
router.get("/products", async (req, res) => {
  try {
    const { category, search } = req.query as { category?: string; search?: string };
    res.json(await getAllProductsWithDetails(category, search));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/products/:id", async (req, res) => {
  try {
    const product = await getProductWithDetails(parseInt(req.params.id));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(product);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/products", async (req, res) => {
  try {
    const { name, name_en, emoji, category, min_kg, bg_color,
      varieties: vars = [], benefits = [], disadvantages = [] } = req.body as {
      name: string; name_en: string; emoji: string; category: string;
      min_kg?: number; bg_color?: string;
      varieties?: VarietyInput[];
      benefits?: string[];
      disadvantages?: string[];
    };
    if (!name || !name_en || !emoji || !category) { res.status(400).json({ error: "Required fields missing" }); return; }
    const [inserted] = await db.insert(products).values({
      name, nameEn: name_en, emoji, category,
      minKg: min_kg || 10,
      bgColor: bg_color || "linear-gradient(135deg,#e8f5e8,#d1fae5)",
    }).returning({ id: products.id });
    const productId = inserted.id;
    for (const v of vars) {
      const [vr] = await db.insert(varieties).values({
        productId, name: v.name, pricePerKg: v.price_per_kg,
        description: v.description || null, shelfLife: v.shelf_life || null,
        inStock: v.in_stock !== false,
      }).returning({ id: varieties.id });
      for (const b of (v.benefits || []))
        await db.insert(varietyBenefits).values({ varietyId: vr.id, benefitText: (b as any).text || b, type: "benefit" });
      for (const d of (v.disadvantages || []))
        await db.insert(varietyBenefits).values({ varietyId: vr.id, benefitText: (d as any).text || d, type: "disadvantage" });
    }
    for (const b of benefits as string[])
      await db.insert(productBenefits).values({ productId, benefitText: b, type: "benefit" });
    for (const d of disadvantages as string[])
      await db.insert(productBenefits).values({ productId, benefitText: d, type: "disadvantage" });
    res.status(201).json(await getProductWithDetails(productId));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.put("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, name_en, emoji, category, min_kg, bg_color,
      varieties: vars = [], benefits = [], disadvantages = [] } = req.body as {
      name: string; name_en: string; emoji: string; category: string;
      min_kg?: number; bg_color?: string;
      varieties?: VarietyInput[];
      benefits?: string[];
      disadvantages?: string[];
    };
    const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await db.update(products).set({
      name, nameEn: name_en, emoji, category,
      minKg: min_kg || 10,
      bgColor: bg_color || "linear-gradient(135deg,#e8f5e8,#d1fae5)",
    }).where(eq(products.id, id));
    await db.delete(productBenefits).where(eq(productBenefits.productId, id));
    for (const b of benefits as string[])
      await db.insert(productBenefits).values({ productId: id, benefitText: b, type: "benefit" });
    for (const d of disadvantages as string[])
      await db.insert(productBenefits).values({ productId: id, benefitText: d, type: "disadvantage" });
    await saveVarieties(id, vars);
    res.json(await getProductWithDetails(id));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await db.delete(products).where(eq(products.id, id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/products/:id/varieties/:varietyId/stock", async (req, res) => {
  try {
    const varietyId = parseInt(req.params.varietyId);
    const { in_stock, stock_level } = req.body as { in_stock: boolean; stock_level?: string };
    const [existing] = await db.select().from(varieties).where(eq(varieties.id, varietyId));
    if (!existing) { res.status(404).json({ error: "Variety not found" }); return; }
    await db.update(varieties).set({
      inStock: in_stock,
      stockLevel: stock_level || (in_stock ? "High" : "Out of Stock"),
    }).where(eq(varieties.id, varietyId));
    const [updated] = await db.select().from(varieties).where(eq(varieties.id, varietyId));
    res.json({ ...updated, in_stock: updated.inStock });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/products/:id/varieties/:varietyId", async (req, res) => {
  try {
    const varietyId = parseInt(req.params.varietyId);
    const productId = parseInt(req.params.id);
    const [existing] = await db.select().from(varieties)
      .where(and(eq(varieties.id, varietyId), eq(varieties.productId, productId)));
    if (!existing) { res.status(404).json({ error: "Variety not found" }); return; }
    await db.delete(varieties).where(eq(varieties.id, varietyId));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Orders ────────────────────────────────────────────────────────────────────
router.get("/orders", async (req, res) => {
  try {
    const { phone, status, slot } = req.query as { phone?: string; status?: string; slot?: string };
    let query = db
      .select({
        order: orders,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerLat: customers.lat,
        customerLng: customers.lng,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .$dynamic();

    const conditions = [];
    if (phone) conditions.push(eq(customers.phone, phone));
    if (status && status !== "all") conditions.push(eq(orders.status, status));
    if (slot && slot !== "all") conditions.push(eq(orders.deliverySlot, slot));
    if (conditions.length === 1) query = query.where(conditions[0]);
    else if (conditions.length > 1) query = query.where(and(...conditions));
    query = query.orderBy(desc(orders.createdAt));

    const rows = await query;
    const result = await Promise.all(rows.map(async row => {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, row.order.id));
      return {
        ...row.order,
        delivery_slot: row.order.deliverySlot,
        total_amount: row.order.totalAmount,
        payment_status: row.order.paymentStatus,
        return_requested: row.order.returnRequested,
        return_note: row.order.returnNote,
        created_at: row.order.createdAt,
        customer_id: row.order.customerId,
        customer_name: row.customerName,
        customer_phone: row.customerPhone,
        customer_lat: row.customerLat,
        customer_lng: row.customerLng,
        items: items.map(i => ({
          ...i,
          order_id: i.orderId,
          variety_id: i.varietyId,
          product_name: i.productName,
          variety_name: i.varietyName,
          price_per_kg: i.pricePerKg,
          quantity_kg: i.quantityKg,
        })),
      };
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/orders", async (req, res) => {
  try {
    const { customer_id, village, address, delivery_slot, items = [] } = req.body as {
      customer_id: number; village: string; address?: string; delivery_slot?: string;
      items: { variety_id: number; product_name: string; variety_name: string; price_per_kg: number; quantity_kg: number }[]
    };
    if (!customer_id || !village || !items.length) { res.status(400).json({ error: "Required fields missing" }); return; }
    if (!ALLOWED_VILLAGES.includes(village)) { res.status(400).json({ error: "Delivery not available here" }); return; }
    const total = items.reduce((s, i) => s + i.price_per_kg * i.quantity_kg, 0);
    const [inserted] = await db.insert(orders).values({
      customerId: customer_id, village, address: address || null,
      deliverySlot: delivery_slot || null, totalAmount: total,
      status: "placed", paymentStatus: "pending",
    }).returning({ id: orders.id });
    const orderId = inserted.id;
    for (const item of items)
      await db.insert(orderItems).values({
        orderId, varietyId: item.variety_id, productName: item.product_name,
        varietyName: item.variety_name, pricePerKg: item.price_per_kg, quantityKg: item.quantity_kg,
      });
    res.status(201).json(await getOrderWithDetails(orderId));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/orders/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body as { status: string };
    const valid = ["placed","accepted","out_for_delivery","delivered","cancelled"];
    if (!valid.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
    const [existing] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await db.update(orders).set({ status }).where(eq(orders.id, id));
    res.json(await getOrderWithDetails(id));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/orders/:id/return", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { note } = req.body as { note: string };
    const [existing] = await db.select().from(orders).where(eq(orders.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.status !== "delivered") { res.status(400).json({ error: "Only delivered orders can be returned" }); return; }
    await db.update(orders).set({ returnRequested: true, returnNote: note || "Return requested" }).where(eq(orders.id, id));
    res.json(await getOrderWithDetails(id));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/dashboard/stats", async (_req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [newOrdersRow] = await db.select({ c: count() }).from(orders).where(eq(orders.status, "placed"));
    const newOrders = newOrdersRow.c;

    const [earningsRow] = await db.select({ total: sum(orders.totalAmount) }).from(orders)
      .where(and(
        sql`DATE(${orders.createdAt}) = ${today}`,
        inArray(orders.status, ["accepted","out_for_delivery","delivered"])
      ));
    const todayEarnings = Number(earningsRow.total) || 0;

    const [totalTodayRow] = await db.select({ c: count() }).from(orders)
      .where(sql`DATE(${orders.createdAt}) = ${today}`);
    const totalOrdersToday = totalTodayRow.c;

    const [villagesRow] = await db.select({ c: countDistinct(orders.village) }).from(orders)
      .where(sql`DATE(${orders.createdAt}) = ${today}`);
    const villagesServed = villagesRow.c;

    const slotBreakdown = await db.select({
      delivery_slot: orders.deliverySlot,
      count: count(),
    }).from(orders)
      .where(and(
        sql`DATE(${orders.createdAt}) = ${today}`,
        ne(orders.status, "cancelled")
      ))
      .groupBy(orders.deliverySlot);

    const stockSummary = (await db
      .select({
        product_name: products.name,
        variety_name: varieties.name,
        in_stock: varieties.inStock,
        stock_level: varieties.stockLevel,
      })
      .from(varieties)
      .leftJoin(products, eq(varieties.productId, products.id))
      .orderBy(asc(varieties.inStock), asc(products.id))
      .limit(10)
    ).map(s => ({ ...s, in_stock: s.in_stock }));

    res.json({
      new_orders: newOrders,
      today_earnings: todayEarnings,
      village_count: Math.max(villagesServed, ALLOWED_VILLAGES.length),
      total_orders_today: totalOrdersToday,
      low_stock_count: 0,
      stock_summary: stockSummary,
      slot_breakdown: slotBreakdown,
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

export default router;
