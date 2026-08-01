import { pgTable, serial, integer, text, real, boolean } from "drizzle-orm/pg-core";
import { products } from "./products";

export const varieties = pgTable("varieties", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  pricePerKg: real("price_per_kg").notNull(),
  description: text("description"),
  shelfLife: text("shelf_life"),
  inStock: boolean("in_stock").notNull().default(true),
  stockLevel: text("stock_level").default("High"),
  offerPrice: real("offer_price"),
  offerLabel: text("offer_label"),
});

export type Variety = typeof varieties.$inferSelect;
export type InsertVariety = typeof varieties.$inferInsert;
