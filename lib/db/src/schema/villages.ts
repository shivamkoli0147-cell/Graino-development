import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const villages = pgTable("villages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export type Village = typeof villages.$inferSelect;
export type InsertVillage = typeof villages.$inferInsert;
