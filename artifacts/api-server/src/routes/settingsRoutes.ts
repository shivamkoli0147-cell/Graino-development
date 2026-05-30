import { Router, type IRouter } from "express";
import multer from "multer";
import { db } from "../db.js";
import { villages, categories } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET } from "../config.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const DEFAULT_VILLAGES = [
  "Pichor", "Bamori", "Datia", "Sirsod", "Lahar",
  "Dabra", "Mungaoli", "Khategaon", "Indergarh", "Bhander",
];

export async function seedDefaultVillages() {
  try {
    const existing = await db.select({ id: villages.id }).from(villages).limit(1);
    if (existing.length > 0) return;
    for (const name of DEFAULT_VILLAGES) {
      await db.insert(villages).values({ name }).onConflictDoNothing();
    }
    console.log("Seeded default villages");
  } catch (e) {
    console.warn("Village seed skipped:", String(e));
  }
}

// ── Supabase Storage helpers ──────────────────────────────────────────────────
async function uploadCategoryImage(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `categories/${Date.now()}-${safeName}`;
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

async function deleteCategoryImage(imageUrl: string): Promise<void> {
  try {
    const marker = `/object/public/${SUPABASE_STORAGE_BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) return;
    const filePath = imageUrl.slice(idx + marker.length);
    await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${filePath}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
  } catch (e) {
    console.warn("[storage] deleteCategoryImage error:", String(e));
  }
}

// ── Village routes ────────────────────────────────────────────────────────────
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

// ── Category routes ───────────────────────────────────────────────────────────
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
    // Delete image from storage if exists
    const [existing] = await db.select({ image_url: categories.image_url }).from(categories).where(eq(categories.id, id));
    if (existing?.image_url) void deleteCategoryImage(existing.image_url);
    await db.delete(categories).where(eq(categories.id, id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Category image upload ─────────────────────────────────────────────────────
router.post("/settings/categories/:id/image", upload.single("image"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const file = req.file;
    if (!file) { res.status(400).json({ error: "No image file" }); return; }

    // Delete old image if present
    const [existing] = await db.select({ image_url: categories.image_url }).from(categories).where(eq(categories.id, id));
    if (existing?.image_url) void deleteCategoryImage(existing.image_url);

    const imageUrl = await uploadCategoryImage(file.buffer, file.originalname, file.mimetype);
    const [updated] = await db.update(categories).set({ image_url: imageUrl }).where(eq(categories.id, id)).returning();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Category image remove ─────────────────────────────────────────────────────
router.delete("/settings/categories/:id/image", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select({ image_url: categories.image_url }).from(categories).where(eq(categories.id, id));
    if (existing?.image_url) void deleteCategoryImage(existing.image_url);
    const [updated] = await db.update(categories).set({ image_url: null }).where(eq(categories.id, id)).returning();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

export default router;
