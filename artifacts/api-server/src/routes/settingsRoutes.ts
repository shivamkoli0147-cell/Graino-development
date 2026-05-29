import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { villages, categories } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

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
