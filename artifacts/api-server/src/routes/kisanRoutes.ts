import { Router } from "express";
import multer from "multer";
import { db } from "../db.js";
import {
  villages, customers, products, varieties,
  productBenefits, varietyBenefits, orders, orderItems, productImages, varietyImages, categories,
  productRatings,
} from "@workspace/db/schema";
import { eq, and, ilike, or, sql, count, sum, countDistinct, asc, desc, inArray, ne } from "drizzle-orm";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET } from "../config.js";
import { sendOtp, verifyOtp, verifySellerOtp, normalizePhone, SELLER_PHONE } from "../otpService.js";

// ── Multer (memory storage for Supabase upload) ───────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Supabase bucket auto-create ────────────────────────────────────────────────
async function ensureSupabaseBucket(): Promise<void> {
  try {
    const checkRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${SUPABASE_STORAGE_BUCKET}`, {
      headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (checkRes.ok) {
      console.log(`[storage] Bucket "${SUPABASE_STORAGE_BUCKET}" already exists.`);
      return;
    }
    const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: SUPABASE_STORAGE_BUCKET, name: SUPABASE_STORAGE_BUCKET, public: true }),
    });
    if (createRes.ok) {
      console.log(`[storage] Bucket "${SUPABASE_STORAGE_BUCKET}" created successfully.`);
    } else {
      const text = await createRes.text();
      console.error(`[storage] Failed to create bucket: ${createRes.status} ${text}`);
    }
  } catch (e) {
    console.error("[storage] ensureSupabaseBucket error:", String(e));
  }
}
void ensureSupabaseBucket();

// ── Supabase Storage upload helper ────────────────────────────────────────────
async function uploadToSupabase(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `products/${Date.now()}-${safeName}`;
  const storageUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${path}`;
  const res = await fetch(storageUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": mimetype,
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upload failed: ${res.status} ${text}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${path}`;
}

// ── Supabase Storage delete helper ────────────────────────────────────────────
async function deleteFromSupabase(imageUrl: string): Promise<void> {
  try {
    const marker = `/object/public/${SUPABASE_STORAGE_BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) return;
    const filePath = imageUrl.slice(idx + marker.length);
    const deleteRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${filePath}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!deleteRes.ok) {
      const text = await deleteRes.text();
      console.warn(`[storage] Delete warning: ${deleteRes.status} ${text}`);
    }
  } catch (e) {
    console.warn("[storage] deleteFromSupabase error:", String(e));
  }
}

// ── Invoice HTML generator ─────────────────────────────────────────────────────
function generateInvoiceHtml(params: {
  orderId: number;
  orderDate: Date | null;
  customerName: string | null;
  customerPhone: string | null;
  village: string;
  address?: string | null;
  items: { product_name: string; variety_name: string; price_per_kg: number; quantity_kg: number }[];
  totalAmount: number;
  paymentStatus: string;
}): string {
  const fmtINR = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");
  const d = params.orderDate ? new Date(params.orderDate) : new Date();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const orderDate  = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const orderTime  = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2,"0")} ${d.getHours() < 12 ? "AM" : "PM"}`;
  const now = new Date();
  const genDate    = `${now.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })} at ${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2,"0")} ${now.getHours() < 12 ? "AM" : "PM"}`;
  const totalStr   = fmtINR(params.totalAmount);
  const payBadge   = params.paymentStatus === "paid" ? "✅ Paid Online" : "💵 Cash on Delivery";
  const itemCount  = params.items.length;

  const itemRows = params.items.map(item => {
    const sub = item.price_per_kg * item.quantity_kg;
    return `<tr>
      <td><div class="pn">${item.product_name}</div><div class="vn">${item.variety_name}</div></td>
      <td>${item.quantity_kg} kg</td>
      <td>${fmtINR(item.price_per_kg)}/kg</td>
      <td class="amt">${fmtINR(sub)}</td>
    </tr>`;
  }).join("\n");

  const addrExtra = params.address ? `<br>${params.address}` : "";

  return `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice #${params.orderId} – Graino</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f7f0;min-height:100vh}
.page{max-width:620px;margin:0 auto;background:#fff;min-height:100vh;box-shadow:0 0 40px rgba(0,0,0,.07)}
.hdr{background:linear-gradient(135deg,#1a3d1a 0%,#2d6a2d 100%);padding:24px 20px 18px}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.bi{width:48px;height:48px;background:rgba(255,255,255,.18);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px}
.bn{font-size:22px;font-weight:900;color:#fff;letter-spacing:-.5px}
.bs{font-size:11px;color:rgba(255,255,255,.6);margin-top:2px}
.imeta{display:flex;justify-content:space-between;align-items:flex-end}
.ilbl{font-size:11px;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.1em}
.inum{font-size:32px;font-weight:900;color:#fff;letter-spacing:-1px;margin-top:2px}
.stamp{background:#4ade80;color:#14532d;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
.dbar{background:#f0fdf4;border-bottom:1px solid #dcfce7;padding:9px 20px;display:flex;gap:24px;flex-wrap:wrap;font-size:12px;color:#555}
.dbar b{color:#1a6b1a}
.body{padding:20px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
.party{background:#fafafa;border:1px solid #f0ede8;border-radius:12px;padding:12px}
.plbl{font-size:10px;font-weight:800;color:#aaa;text-transform:uppercase;letter-spacing:.1em;margin-bottom:7px}
.pname{font-size:14px;font-weight:800;color:#1C1C1C;margin-bottom:3px}
.pdet{font-size:11px;color:#666;line-height:1.6}
.stitle{font-size:11px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
.tbl{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:14px}
.tbl thead th{background:#f8fdf8;color:#1a6b1a;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:8px 10px;border-bottom:2px solid #dcfce7;text-align:left}
.tbl thead th:nth-child(n+2){text-align:right}
.tbl tbody td{padding:9px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top}
.tbl tbody td:nth-child(n+2){text-align:right}
.tbl tbody tr:last-child td{border-bottom:none}
.pn{font-weight:700;color:#1C1C1C}.vn{font-size:11px;color:#888;margin-top:2px}
.amt{font-weight:800;color:#1a3d1a}
.tbox{background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;padding:14px 16px;margin-bottom:20px}
.tr{display:flex;justify-content:space-between;font-size:12px;color:#666;margin-bottom:5px}
.tr.fr{color:#16a34a;font-weight:600}
.tfinal{display:flex;justify-content:space-between;align-items:center;border-top:1.5px dashed #86efac;margin-top:10px;padding-top:12px}
.tlbl{font-size:15px;font-weight:700;color:#1a3d1a}
.tamt{font-size:26px;font-weight:900;color:#1a6b1a;letter-spacing:-.5px}
.pbadge{display:inline-flex;align-items:center;gap:5px;background:#dcfce7;color:#15803d;border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;margin-top:10px}
.footer{margin-top:8px;padding-top:20px;border-top:1px dashed #e5e7eb;text-align:center;padding-bottom:28px}
.fbrand{font-size:18px;font-weight:900;color:#1a6b1a;margin-bottom:6px}
.fsub{font-size:11px;color:#999;line-height:1.8}
.ptip{margin-top:16px;background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;font-size:11px;color:#92400e;display:flex;align-items:center;gap:8px;text-align:left}
@media print{body{background:#fff}.page{box-shadow:none;min-height:auto}.ptip{display:none}}
</style>
</head>
<body>
<div class="page">

<div class="hdr">
  <div class="brand">
    <div class="bi">🌾</div>
    <div><div class="bn">Graino</div><div class="bs">किसान से सीधे आपके द्वार &middot; Fresh from Farm to You</div></div>
  </div>
  <div class="imeta">
    <div><div class="ilbl">Tax Invoice / Receipt</div><div class="inum">#${params.orderId}</div></div>
    <div class="stamp">✓ &nbsp;Delivered</div>
  </div>
</div>

<div class="dbar">
  <span>📅 Order: <b>${orderDate}</b> at <b>${orderTime}</b></span>
  <span>🖨 Generated: <b>${genDate}</b></span>
</div>

<div class="body">

  <div class="parties">
    <div class="party">
      <div class="plbl">👤 Buyer</div>
      <div class="pname">${params.customerName || "Customer"}</div>
      <div class="pdet">📱 ${params.customerPhone || "—"}</div>
      <div class="pdet">📍 ${params.village}${addrExtra}</div>
    </div>
    <div class="party">
      <div class="plbl">🌾 Seller</div>
      <div class="pname">Graino Seller</div>
      <div class="pdet">Graino Partner</div>
      <div class="pdet">📍 Madhya Pradesh</div>
      <div class="pdet">📞 7089550147</div>
    </div>
  </div>

  <div class="stitle">🛒 Order Items</div>
  <table class="tbl">
    <thead><tr><th>Product</th><th>Qty</th><th>Rate/kg</th><th>Amount</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="tbox">
    <div class="tr"><span>Subtotal (${itemCount} item${itemCount > 1 ? "s" : ""})</span><span>${totalStr}</span></div>
    <div class="tr fr"><span>🚚 Delivery</span><span>FREE</span></div>
    <div class="tfinal">
      <span class="tlbl">Total</span>
      <span class="tamt">${totalStr}</span>
    </div>
    <div><span class="pbadge">${payBadge}</span></div>
  </div>

  <div class="footer">
    <div class="fbrand">🌾 Graino</div>
    <div class="fsub">
      किसान से सीधे आपके द्वार &nbsp;&middot;&nbsp; Fresh from Farm to You<br>
      Support: 7089550147 &nbsp;&middot;&nbsp; Platform: Graino<br>
      Invoice generated on ${genDate}
    </div>
    <div class="ptip">💡 <span>PDF Save करने के लिए: Browser Menu → <b>Print</b> → <b>"Save as PDF"</b> चुनें</span></div>
  </div>

</div>
</div>
</body>
</html>`;
}

async function generateAndSaveInvoice(orderId: number): Promise<string | null> {
  try {
    const orderData = await getOrderWithDetails(orderId);
    if (!orderData) return null;
    const html = generateInvoiceHtml({
      orderId,
      orderDate: orderData.createdAt as Date | null,
      customerName: orderData.customer_name ?? null,
      customerPhone: orderData.customer_phone ?? null,
      village: orderData.village,
      address: orderData.address,
      items: orderData.items,
      totalAmount: orderData.total_amount,
      paymentStatus: orderData.payment_status,
    });
    const buf = Buffer.from(html, "utf-8");
    const path = `invoices/order-${orderId}.html`;
    const storageUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${path}`;
    const res = await fetch(storageUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "text/html; charset=utf-8",
        "x-upsert": "true",
      },
      body: buf,
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`[invoice] Upload failed: ${res.status} ${txt}`);
      return null;
    }
    const invoiceUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${path}`;
    await db.update(orders).set({ invoiceUrl }).where(eq(orders.id, orderId));
    console.log(`[invoice] Saved for order #${orderId}: ${invoiceUrl}`);
    return invoiceUrl;
  } catch (e) {
    console.error("[invoice] generateAndSaveInvoice error:", String(e));
    return null;
  }
}

// ── Seed static product images (runs once on startup if table empty) ───────────
const STATIC_IMAGE_SEED: Record<string, string[]> = {
  "Wheat":       ["/images/products/wheat-1.jpg", "/images/products/wheat-2.jpg", "/images/products/wheat-3.jpg", "/images/products/wheat-4.jpg"],
  "Moong Dal":   ["/images/products/moong-dal-2.jpg"],
  "Chana":       ["/images/products/chana-1.jpg", "/images/products/chana-2.jpg", "/images/products/chana-3.jpg"],
  "Moongfali":   ["/images/products/moongfali-1.jpg", "/images/products/moongfali-2.jpg"],
  "Maize":       ["/images/products/maize-1.jpg", "/images/products/maize-2.jpg"],
  "Fenugreek":   ["/images/products/methi-1.jpg", "/images/products/methi-2.jpg"],
};

async function seedStaticImages() {
  try {
    const existing = await db.select({ id: productImages.id }).from(productImages).limit(1);
    if (existing.length > 0) return;
    const allProducts = await db.select({ id: products.id, nameEn: products.nameEn }).from(products);
    for (const p of allProducts) {
      const images = STATIC_IMAGE_SEED[p.nameEn] ?? [];
      for (let i = 0; i < images.length; i++) {
        await db.insert(productImages).values({ productId: p.id, imageUrl: images[i], sortOrder: i });
      }
    }
    console.log("Seeded static product images");
  } catch (e) {
    console.warn("Image seed skipped:", String(e));
  }
}
void seedStaticImages();

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

function mapVariety(
  v: { id: number; productId: number; name: string; pricePerKg: number; description: string | null; shelfLife: string | null; inStock: boolean; stockLevel: string | null; offerPrice?: number | null; offerLabel?: string | null },
  vb: { benefits: { id: number; text: string }[]; disadvantages: { id: number; text: string }[] },
  images: { id: number; url: string; sort_order: number }[] = [],
) {
  return {
    ...v,
    product_id: v.productId,
    price_per_kg: v.pricePerKg,
    shelf_life: v.shelfLife,
    in_stock: v.inStock,
    stock_level: v.stockLevel,
    offer_price: v.offerPrice ?? null,
    offer_label: v.offerLabel ?? null,
    images,
    ...vb,
  };
}

function mapProduct(p: { id: number; name: string; nameEn: string; emoji: string; category: string; minKg: number; bgColor: string; pricePerKg?: number | null; createdAt: Date | null }) {
  return {
    ...p,
    name_en: p.nameEn,
    min_kg: p.minKg,
    bg_color: p.bgColor,
    price_per_kg: p.pricePerKg ?? null,
    created_at: p.createdAt,
  };
}

async function getProductImages(productId: number) {
  const imgs = await db.select().from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder), asc(productImages.id));
  return imgs.map(i => ({ id: i.id, url: i.imageUrl, sort_order: i.sortOrder }));
}

async function getVarietyImages(varietyId: number) {
  const imgs = await db.select().from(varietyImages)
    .where(eq(varietyImages.varietyId, varietyId))
    .orderBy(asc(varietyImages.sortOrder), asc(varietyImages.id));
  return imgs.map(i => ({ id: i.id, url: i.imageUrl, sort_order: i.sortOrder }));
}

async function getProductWithDetails(id: number) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return null;
  const [vars, pBenefits, images] = await Promise.all([
    db.select().from(varieties).where(eq(varieties.productId, id)).orderBy(asc(varieties.id)),
    db.select().from(productBenefits).where(eq(productBenefits.productId, id)),
    getProductImages(id),
  ]);
  const varWithBenefits = await Promise.all(vars.map(async v => {
    const [vb, vImgs] = await Promise.all([getVarietyBenefitsData(v.id), getVarietyImages(v.id)]);
    return mapVariety(v, vb, vImgs);
  }));
  return {
    ...mapProduct(product),
    images,
    varieties: varWithBenefits,
    benefits: pBenefits.filter(b => b.type === "benefit").map(b => ({ id: b.id, text: b.benefitText })),
    disadvantages: pBenefits.filter(b => b.type === "disadvantage").map(b => ({ id: b.id, text: b.benefitText })),
  };
}

async function getAllProductsWithDetails(search?: string) {
  let query = db.select().from(products).$dynamic();
  if (search) query = query.where(or(ilike(products.name, `%${search}%`), ilike(products.nameEn, `%${search}%`))!);
  query = query.orderBy(asc(products.id));
  const rows = await query;
  return Promise.all(rows.map(async p => {
    const [vars, pBenefits, images] = await Promise.all([
      db.select().from(varieties).where(eq(varieties.productId, p.id)).orderBy(asc(varieties.id)),
      db.select().from(productBenefits).where(eq(productBenefits.productId, p.id)),
      getProductImages(p.id),
    ]);
    const varWithBenefits = await Promise.all(vars.map(async v => {
      const [vb, vImgs] = await Promise.all([getVarietyBenefitsData(v.id), getVarietyImages(v.id)]);
      return mapVariety(v, vb, vImgs);
    }));
    return {
      ...mapProduct(p),
      images,
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
    return_status: order.returnStatus,
    invoice_url: order.invoiceUrl ?? null,
    delivered_at: order.deliveredAt ? order.deliveredAt.toISOString() : null,
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
  offer_price?: number | null; offer_label?: string | null;
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
        offerPrice: v.offer_price ?? null,
        offerLabel: v.offer_label || null,
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
        offerPrice: v.offer_price ?? null,
        offerLabel: v.offer_label || null,
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

// Send OTP — real SMS via Fast2SMS for all numbers except the fixed seller number.
router.post("/auth/send-otp", async (req, res) => {
  try {
    const phone = normalizePhone((req.body as { phone?: string }).phone || "");
    if (!phone || !/^\d{10}$/.test(phone)) { res.status(400).json({ error: "10 अंकों का सही फोन नंबर डालें" }); return; }
    const result = await sendOtp(phone);
    if (!result.success) { res.status(500).json({ error: result.error || "OTP भेजने में समस्या हुई" }); return; }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/auth/customer", async (req, res) => {
  try {
    const { phone, otp, name, village, address, lat, lng } = req.body as {
      phone: string; otp: string; name?: string; village?: string;
      address?: string; lat?: number; lng?: number;
    };
    if (!phone || !otp) { res.status(400).json({ error: "Phone and OTP required" }); return; }
    if (phone === SELLER_PHONE) { res.status(400).json({ error: "यह नंबर विक्रेता लॉगिन के लिए आरक्षित है" }); return; }
    const verified = await verifyOtp(phone, otp.toString().trim());
    if (!verified.valid) { res.status(401).json({ error: verified.error || "गलत OTP" }); return; }
    const [existing] = await db.select().from(customers).where(eq(customers.phone, phone));
    if (existing) {
      const patch: Record<string, unknown> = {};
      if (name) patch.name = name;
      if (village) patch.village = village;
      if (address) patch.address = address;
      if (lat != null) patch.lat = lat;
      if (lng != null) patch.lng = lng;
      if (Object.keys(patch).length > 0) {
        await db.update(customers).set(patch).where(eq(customers.phone, phone));
      }
      const [updated] = await db.select().from(customers).where(eq(customers.phone, phone));
      res.json({ success: true, customer: updated });
      return;
    }
    const [inserted] = await db.insert(customers).values({
      name: name || "", phone, village: village || "",
      address: address || null, lat: lat ?? null, lng: lng ?? null,
    }).returning();
    res.json({ success: true, customer: inserted });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/auth/seller", (req, res) => {
  const { phone, otp } = req.body as { phone: string; otp: string };
  if (!phone || !otp) { res.status(400).json({ success: false, message: "Phone and OTP required" }); return; }
  const verified = verifySellerOtp(phone, otp.toString().trim());
  if (verified.valid) res.json({ success: true, message: "Seller login successful" });
  else res.status(401).json({ success: false, message: verified.error || "गलत credentials" });
});

// ── Customer profile update ───────────────────────────────────────────────────
router.put("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, address, lat, lng, village } = req.body as {
      name?: string; address?: string; lat?: number; lng?: number; village?: string;
    };
    const [existing] = await db.select().from(customers).where(eq(customers.id, id));
    if (!existing) { res.status(404).json({ error: "Customer not found" }); return; }
    await db.update(customers).set({
      name: name || existing.name,
      village: village || existing.village,
      address: address !== undefined ? address : existing.address,
      lat: lat ?? existing.lat,
      lng: lng ?? existing.lng,
    }).where(eq(customers.id, id));
    const [updated] = await db.select().from(customers).where(eq(customers.id, id));
    res.json(updated);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Customer village / partial update ─────────────────────────────────────────
router.patch("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { village, name, address, lat, lng } = req.body as {
      village?: string; name?: string; address?: string; lat?: number; lng?: number;
    };
    const [existing] = await db.select().from(customers).where(eq(customers.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    const patch: Record<string, unknown> = {};
    if (village !== undefined) patch.village = village;
    if (name !== undefined) patch.name = name;
    if (address !== undefined) patch.address = address;
    if (lat !== undefined) patch.lat = lat;
    if (lng !== undefined) patch.lng = lng;
    if (Object.keys(patch).length === 0) { res.json(existing); return; }
    await db.update(customers).set(patch).where(eq(customers.id, id));
    const [updated] = await db.select().from(customers).where(eq(customers.id, id));
    res.json(updated);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Products ──────────────────────────────────────────────────────────────────
router.get("/products", async (req, res) => {
  try {
    const { search } = req.query as { search?: string };
    res.json(await getAllProductsWithDetails(search));
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
    const { name, name_en, emoji, category = "", min_kg, bg_color, price_per_kg,
      varieties: vars = [], benefits = [], disadvantages = [] } = req.body as {
      name: string; name_en: string; emoji: string; category?: string;
      min_kg?: number; bg_color?: string; price_per_kg?: number | null;
      varieties?: VarietyInput[];
      benefits?: string[];
      disadvantages?: string[];
    };
    if (!name || !name_en || !emoji) { res.status(400).json({ error: "Required fields missing" }); return; }
    const [inserted] = await db.insert(products).values({
      name, nameEn: name_en, emoji, category: category || "",
      minKg: min_kg || 10,
      bgColor: bg_color || "linear-gradient(135deg,#e8f5e8,#d1fae5)",
      pricePerKg: price_per_kg ?? null,
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
    const { name, name_en, emoji, category = "", min_kg, bg_color, price_per_kg,
      varieties: vars = [], benefits = [], disadvantages = [] } = req.body as {
      name: string; name_en: string; emoji: string; category?: string;
      min_kg?: number; bg_color?: string; price_per_kg?: number | null;
      varieties?: VarietyInput[];
      benefits?: string[];
      disadvantages?: string[];
    };
    const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await db.update(products).set({
      name, nameEn: name_en, emoji, category: category || "",
      minKg: min_kg || 10,
      bgColor: bg_color || "linear-gradient(135deg,#e8f5e8,#d1fae5)",
      pricePerKg: price_per_kg ?? null,
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

// ── Product Images ────────────────────────────────────────────────────────────

router.get("/products/:id/images", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const imgs = await getProductImages(id);
    res.json(imgs);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/products/:id/images", upload.array("images", 5), async (req, res) => {
  try {
    const productId = parseInt(req.params["id"] as string);
    const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));
    if (!existing) { res.status(404).json({ error: "Product not found" }); return; }

    const currentCount = (await db.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, productId))).length;
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) { res.status(400).json({ error: "No images uploaded" }); return; }
    if (currentCount + files.length > 5) {
      res.status(400).json({ error: `Maximum 5 images allowed. Currently has ${currentCount}.` }); return;
    }

    const maxOrder = currentCount;
    const inserted = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageUrl = await uploadToSupabase(file.buffer, file.originalname, file.mimetype);
      const [row] = await db.insert(productImages).values({
        productId, imageUrl, sortOrder: maxOrder + i,
      }).returning();
      inserted.push({ id: row.id, url: row.imageUrl, sort_order: row.sortOrder });
    }
    res.status(201).json(inserted);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/products/images/:imageId", async (req, res) => {
  try {
    const imageId = parseInt(req.params.imageId);
    const [existing] = await db.select().from(productImages).where(eq(productImages.id, imageId));
    if (!existing) { res.status(404).json({ error: "Image not found" }); return; }
    await db.delete(productImages).where(eq(productImages.id, imageId));
    void deleteFromSupabase(existing.imageUrl);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/products/:id/images/reorder", async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { order } = req.body as { order: number[] };
    for (let i = 0; i < order.length; i++) {
      await db.update(productImages)
        .set({ sortOrder: i })
        .where(and(eq(productImages.id, order[i]), eq(productImages.productId, productId)));
    }
    res.json(await getProductImages(productId));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Variety Images ────────────────────────────────────────────────────────────

router.get("/products/:id/varieties/:varietyId/images", async (req, res) => {
  try {
    const varietyId = parseInt(req.params.varietyId);
    res.json(await getVarietyImages(varietyId));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/products/:id/varieties/:varietyId/images", upload.array("images", 5), async (req, res) => {
  try {
    const varietyId = parseInt(req.params.varietyId);
    const [existing] = await db.select({ id: varieties.id }).from(varieties).where(eq(varieties.id, varietyId));
    if (!existing) { res.status(404).json({ error: "Variety not found" }); return; }

    const currentCount = (await db.select({ id: varietyImages.id }).from(varietyImages).where(eq(varietyImages.varietyId, varietyId))).length;
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) { res.status(400).json({ error: "No images uploaded" }); return; }
    if (currentCount + files.length > 5) {
      res.status(400).json({ error: `Maximum 5 images allowed. Currently has ${currentCount}.` }); return;
    }

    const inserted = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageUrl = await uploadToSupabase(file.buffer, file.originalname, file.mimetype);
      const [row] = await db.insert(varietyImages).values({
        varietyId, imageUrl, sortOrder: currentCount + i,
      }).returning();
      inserted.push({ id: row.id, url: row.imageUrl, sort_order: row.sortOrder });
    }
    res.status(201).json(inserted);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/varieties/images/:imageId", async (req, res) => {
  try {
    const imageId = parseInt(req.params.imageId);
    const [existing] = await db.select().from(varietyImages).where(eq(varietyImages.id, imageId));
    if (!existing) { res.status(404).json({ error: "Image not found" }); return; }
    await db.delete(varietyImages).where(eq(varietyImages.id, imageId));
    void deleteFromSupabase(existing.imageUrl);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/products/:id/varieties/:varietyId/images/reorder", async (req, res) => {
  try {
    const varietyId = parseInt(req.params.varietyId);
    const { order } = req.body as { order: number[] };
    for (let i = 0; i < order.length; i++) {
      await db.update(varietyImages)
        .set({ sortOrder: i })
        .where(and(eq(varietyImages.id, order[i]), eq(varietyImages.varietyId, varietyId)));
    }
    res.json(await getVarietyImages(varietyId));
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
        return_status: row.order.returnStatus,
        invoice_url: row.order.invoiceUrl ?? null,
        delivered_at: row.order.deliveredAt ? row.order.deliveredAt.toISOString() : null,
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
    const villageRows = await db.select({ name: villages.name }).from(villages);
    if (!villageRows.some(v => v.name === village)) { res.status(400).json({ error: "Delivery not available here" }); return; }
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

// ── Serve invoice HTML directly (bypasses Supabase storage content-type issues) ─
router.get("/orders/:id/invoice", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const orderData = await getOrderWithDetails(id);
    if (!orderData) { res.status(404).send("Order not found"); return; }
    if (orderData.status !== "delivered") { res.status(400).send("Invoice only available for delivered orders"); return; }
    const html = generateInvoiceHtml({
      orderId: id,
      orderDate: orderData.createdAt as Date | null,
      customerName: orderData.customer_name ?? null,
      customerPhone: orderData.customer_phone ?? null,
      village: orderData.village,
      address: orderData.address,
      items: orderData.items,
      totalAmount: orderData.total_amount,
      paymentStatus: orderData.payment_status,
    });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", "inline");
    res.send(html);
  } catch (e) { res.status(500).send(String(e)); }
});

router.patch("/orders/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body as { status: string };
    const valid = ["placed","accepted","out_for_delivery","delivered","cancelled"];
    if (!valid.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
    const [existing] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (status === "delivered") {
      await db.update(orders).set({ status, deliveredAt: new Date() }).where(eq(orders.id, id));
    } else {
      await db.update(orders).set({ status }).where(eq(orders.id, id));
    }
    // Auto-generate receipt when order is delivered
    if (status === "delivered") {
      try { await generateAndSaveInvoice(id); } catch (e) { console.error("[invoice]", String(e)); }
    }
    res.json(await getOrderWithDetails(id));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/orders/:id/return", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { note } = req.body as { note?: string };
    const [existing] = await db.select().from(orders).where(eq(orders.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.status === "cancelled") { res.status(400).json({ error: "Cancelled orders cannot be returned" }); return; }
    if (existing.returnRequested) { res.status(400).json({ error: "Return already requested" }); return; }
    await db.update(orders).set({
      returnRequested: true,
      returnNote: note || "Return requested",
      returnStatus: "requested",
    }).where(eq(orders.id, id));
    res.json(await getOrderWithDetails(id));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Seller: accept / reject / mark picked-up for a return request
router.patch("/orders/:id/return-status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body as { status: string };
    const valid = ["accepted", "rejected", "picked_up"];
    if (!valid.includes(status)) { res.status(400).json({ error: "Invalid return status" }); return; }
    const [existing] = await db.select().from(orders).where(eq(orders.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (!existing.returnRequested) { res.status(400).json({ error: "No return request found" }); return; }
    await db.update(orders).set({ returnStatus: status }).where(eq(orders.id, id));
    res.json(await getOrderWithDetails(id));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Product Ratings ───────────────────────────────────────────────────────────

router.get("/products/:id/ratings", async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const rows = await db.select().from(productRatings)
      .where(eq(productRatings.productId, productId))
      .orderBy(desc(productRatings.createdAt));
    const avg = rows.length ? rows.reduce((s, r) => s + r.stars, 0) / rows.length : 0;
    res.json({
      average: Math.round(avg * 10) / 10,
      count: rows.length,
      ratings: rows.map(r => ({
        id: r.id,
        customer_name: r.customerName || "Customer",
        stars: r.stars,
        comment: r.comment,
        created_at: r.createdAt,
      })),
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/products/:id/ratings", async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { customer_id, customer_name, stars, comment } = req.body as {
      customer_id?: number; customer_name?: string; stars: number; comment?: string;
    };
    if (!stars || stars < 1 || stars > 5) { res.status(400).json({ error: "Stars must be 1–5" }); return; }
    const [prod] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));
    if (!prod) { res.status(404).json({ error: "Product not found" }); return; }
    const [inserted] = await db.insert(productRatings).values({
      productId, customerId: customer_id || null,
      customerName: customer_name || "Customer",
      stars, comment: comment || null,
    }).returning();
    res.status(201).json(inserted);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Admin: Rating CRUD ────────────────────────────────────────────────────────

// All products with their rating summary (for admin list view)
router.get("/admin/products-ratings", async (_req, res) => {
  try {
    const allProducts = await db.select({ id: products.id, name: products.name, nameEn: products.nameEn, emoji: products.emoji }).from(products).orderBy(asc(products.id));
    const result = await Promise.all(allProducts.map(async p => {
      const rows = await db.select({ stars: productRatings.stars }).from(productRatings).where(eq(productRatings.productId, p.id));
      const avg = rows.length ? Math.round((rows.reduce((s, r) => s + r.stars, 0) / rows.length) * 10) / 10 : 0;
      return { id: p.id, name: p.name, name_en: p.nameEn, emoji: p.emoji, count: rows.length, average: avg };
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Edit a review
router.put("/admin/ratings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { customer_name, stars, comment } = req.body as { customer_name?: string; stars?: number; comment?: string };
    const [existing] = await db.select().from(productRatings).where(eq(productRatings.id, id));
    if (!existing) { res.status(404).json({ error: "Review not found" }); return; }
    if (stars && (stars < 1 || stars > 5)) { res.status(400).json({ error: "Stars must be 1–5" }); return; }
    const [updated] = await db.update(productRatings).set({
      customerName: customer_name ?? existing.customerName,
      stars: stars ?? existing.stars,
      comment: comment !== undefined ? (comment || null) : existing.comment,
    }).where(eq(productRatings.id, id)).returning();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Delete a review
router.delete("/admin/ratings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select({ id: productRatings.id }).from(productRatings).where(eq(productRatings.id, id));
    if (!existing) { res.status(404).json({ error: "Review not found" }); return; }
    await db.delete(productRatings).where(eq(productRatings.id, id));
    res.json({ success: true });
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
      village_count: villagesServed,
      total_orders_today: totalOrdersToday,
      low_stock_count: 0,
      stock_summary: stockSummary,
      slot_breakdown: slotBreakdown,
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Analytics ─────────────────────────────────────────────────────────────────

router.get("/analytics", async (_req, res) => {
  try {
    const topProducts = await db
      .select({
        name: sql<string>`COALESCE(${products.name}, ${orderItems.productName})`,
        emoji: sql<string>`COALESCE(${products.emoji}, '🌾')`,
        revenue: sql<number>`COALESCE(SUM(${orderItems.pricePerKg} * ${orderItems.quantityKg}), 0)`,
        order_count: count(),
      })
      .from(orderItems)
      .leftJoin(varieties, eq(orderItems.varietyId, varieties.id))
      .leftJoin(products, eq(varieties.productId, products.id))
      .groupBy(sql`COALESCE(${products.name}, ${orderItems.productName}), COALESCE(${products.emoji}, '🌾')`)
      .orderBy(desc(sql`SUM(${orderItems.pricePerKg} * ${orderItems.quantityKg})`))
      .limit(5);

    const villageSales = await db
      .select({
        village: orders.village,
        revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        order_count: count(),
      })
      .from(orders)
      .where(ne(orders.status, "cancelled"))
      .groupBy(orders.village)
      .orderBy(desc(sql`SUM(${orders.totalAmount})`))
      .limit(8);

    const earningsTrend = await db
      .select({
        date: sql<string>`TO_CHAR(DATE(${orders.createdAt}), 'YYYY-MM-DD')`,
        earnings: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
      .from(orders)
      .where(and(
        ne(orders.status, "cancelled"),
        sql`${orders.createdAt} >= NOW() - INTERVAL '7 days'`
      ))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    res.json({ top_products: topProducts, village_sales: villageSales, earnings_trend: earningsTrend });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Settings: Villages ────────────────────────────────────────────────────────

router.get("/settings/villages", async (_req, res) => {
  try {
    const rows = await db.select().from(villages).orderBy(asc(villages.name));
    res.json(rows);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/settings/villages", async (req, res) => {
  try {
    const { name } = req.body as { name: string };
    if (!name?.trim()) { res.status(400).json({ error: "Name required" }); return; }
    const existing = await db.select().from(villages).where(eq(villages.name, name.trim()));
    if (existing.length) { res.status(400).json({ error: "Village already exists" }); return; }
    const [row] = await db.insert(villages).values({ name: name.trim() }).returning();
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/settings/villages/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(villages).where(eq(villages.id, id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Settings: Categories ──────────────────────────────────────────────────────

router.get("/settings/categories", async (_req, res) => {
  try {
    const rows = await db.select().from(categories).orderBy(asc(categories.name));
    res.json(rows);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/settings/categories", async (req, res) => {
  try {
    const { name } = req.body as { name: string };
    if (!name?.trim()) { res.status(400).json({ error: "Name required" }); return; }
    const existing = await db.select().from(categories).where(eq(categories.name, name.trim()));
    if (existing.length) { res.status(400).json({ error: "Category already exists" }); return; }
    const [row] = await db.insert(categories).values({ name: name.trim() }).returning();
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/settings/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(categories).where(eq(categories.id, id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

export default router;
