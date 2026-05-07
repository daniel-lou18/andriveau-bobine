import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sourceEntries = sqliteTable("source_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bobine: integer("bobine").notNull(),
  page: integer("page").notNull(),
  rawText: text("raw_text").notNull(),
  sequence: integer("sequence"),
  notes: text("notes"),
});
