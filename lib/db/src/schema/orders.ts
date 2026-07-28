import { pgTable, serial, integer, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { customers } from "./customers";

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  village: text("village").notNull(),
  address: text("address"),
  deliverySlot: text("delivery_slot"),
  totalAmount: real("total_amount").notNull().default(0),
  status: text("status").notNull().default("placed"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  returnRequested: boolean("return_requested").notNull().default(false),
  returnNote: text("return_note"),
  returnStatus: text("return_status"),
  invoiceUrl: text("invoice_url"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
