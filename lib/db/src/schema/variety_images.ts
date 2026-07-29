import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { varieties } from "./varieties";

export const varietyImages = pgTable("variety_images", {
  id: serial("id").primaryKey(),
  varietyId: integer("variety_id").notNull().references(() => varieties.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow(),
});

export type VarietyImage = typeof varietyImages.$inferSelect;
export type InsertVarietyImage = typeof varietyImages.$inferInsert;
