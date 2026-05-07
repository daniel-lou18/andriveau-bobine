import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const arrondissements = sqliteTable(
  "arrondissements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    number: integer("number").notNull(),
    name: text("name").notNull(),
  },
  (table) => [uniqueIndex("arrondissements_number_unique").on(table.number)]
);
