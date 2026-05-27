import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  emoji: text("emoji").notNull(),
  category: text("category").notNull(),
  minKg: integer("min_kg").notNull().default(10),
  bgColor: text("bg_color").notNull().default("linear-gradient(135deg,#e8f5e8,#d1fae5)"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
