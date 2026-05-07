import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const rues = sqliteTable(
  "rues",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    /** Stable normalized form for matching user input / aliases. */
    normalizedName: text("name_normalized").notNull(),
  },
  (table) => [uniqueIndex("rues_name_normalized_unique").on(table.normalizedName)]
);
