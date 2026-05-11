import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { quartiers } from "./quartiers";

export const sourceEntries = sqliteTable("source_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Page-level provenance: the quartier named in the bobine page header. */
  quartierId: integer("quartier_id")
    .references(() => quartiers.id)
    .notNull(),
  bobine: integer("bobine").notNull(),
  page: integer("page").notNull(),
  rawText: text("raw_text").notNull(),
  sequence: integer("sequence"),
  notes: text("notes"),
});
