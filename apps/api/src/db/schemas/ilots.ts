import { integer, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";
import { quartiers } from "./quartiers";

export const ilots = sqliteTable(
  "ilots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    quartierId: integer("quartier_id")
      .references(() => quartiers.id)
      .notNull(),
    number: integer("number").notNull(),
  },
  (table) => [uniqueIndex("ilots_number_unique").on(table.number)]
);
