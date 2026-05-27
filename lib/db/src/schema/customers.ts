import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  village: text("village").notNull(),
  address: text("address"),
  lat: real("lat"),
  lng: real("lng"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
