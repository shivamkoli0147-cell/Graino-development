import { pgTable, serial, integer, text, real } from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  varietyId: integer("variety_id").notNull(),
  productName: text("product_name").notNull(),
  varietyName: text("variety_name").notNull(),
  pricePerKg: real("price_per_kg").notNull(),
  quantityKg: real("quantity_kg").notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;
