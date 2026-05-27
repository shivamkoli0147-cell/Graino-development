import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { varieties } from "./varieties";

export const varietyBenefits = pgTable("variety_benefits", {
  id: serial("id").primaryKey(),
  varietyId: integer("variety_id").notNull().references(() => varieties.id, { onDelete: "cascade" }),
  benefitText: text("benefit_text").notNull(),
  type: text("type").notNull().default("benefit"),
});

export type VarietyBenefit = typeof varietyBenefits.$inferSelect;
export type InsertVarietyBenefit = typeof varietyBenefits.$inferInsert;
