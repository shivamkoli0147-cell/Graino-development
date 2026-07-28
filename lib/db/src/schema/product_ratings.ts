import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { products } from "./products";
import { customers } from "./customers";

export const productRatings = pgTable("product_ratings", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: text("customer_name"),
  stars: integer("stars").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow(),
});

export type ProductRating = typeof productRatings.$inferSelect;
export type InsertProductRating = typeof productRatings.$inferInsert;
