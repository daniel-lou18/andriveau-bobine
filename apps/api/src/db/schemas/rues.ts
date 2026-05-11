import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { voieTypes } from "./voie_types";

export const rues = sqliteTable(
  "rues",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    typeId: integer("type_id")
      .references(() => voieTypes.id)
      .notNull(),
    /** Canonical libelle in display form (keeps apostrophes/hyphens). */
    libelle: text("libelle").notNull(),
    /** Aggressive normalized form for matching user input. */
    libelleNormalized: text("libelle_normalized").notNull(),
  },
  (table) => [
    uniqueIndex("rues_type_libelle_normalized_unique").on(
      table.typeId,
      table.libelleNormalized
    ),
    index("rues_libelle_normalized_idx").on(table.libelleNormalized),
  ]
);
