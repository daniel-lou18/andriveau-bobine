import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { arrondissements } from "./arrondissements";

export const quartiers = sqliteTable(
  "quartiers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    arrondissementId: integer("arrondissement_id")
      .references(() => arrondissements.id)
      .notNull(),
    name: text("name").notNull(),
    /** Use for search / dedup (accents, casing). Filled during extraction. */
    normalizedName: text("name_normalized").notNull(),
  },
  (table) => [
    uniqueIndex("quartiers_arr_normalized_unique").on(
      table.arrondissementId,
      table.normalizedName
    ),
  ]
);
