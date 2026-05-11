import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const voieTypes = sqliteTable(
  "voie_types",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Canonical lowercase code from the official French voie-type vocabulary. */
    code: text("code").notNull(),
  },
  (table) => [uniqueIndex("voie_types_code_unique").on(table.code)]
);
