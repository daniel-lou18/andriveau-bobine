import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { VOIE_TYPES } from "../../lib/voie-type";

export const rues = sqliteTable(
  "rues",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Canonical voie type (e.g. Rue, Avenue, Boulevard). */
    type: text("type", { enum: VOIE_TYPES }).notNull(),
    /** Canonical libelle in display form (keeps apostrophes/hyphens). */
    libelle: text("libelle").notNull(),
    /** Aggressive normalized form for matching user input. */
    libelleNormalized: text("libelle_normalized").notNull(),
  },
  (table) => [
    uniqueIndex("rues_type_libelle_normalized_unique").on(
      table.type,
      table.libelleNormalized
    ),
    index("rues_libelle_normalized_idx").on(table.libelleNormalized),
  ]
);
