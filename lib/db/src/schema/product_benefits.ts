import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { products } from "./products";

export const productBenefits = pgTable("product_benefits", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  benefitText: text("benefit_text").notNull(),
  type: text("type").notNull().default("benefit"),
});

export type ProductBenefit = typeof productBenefits.$inferSelect;
export type InsertProductBenefit = typeof productBenefits.$inferInsert;
