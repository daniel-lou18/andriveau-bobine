import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { rues } from "./rues";
import { sourceEntries } from "./source_entries";

export const streetSegments = sqliteTable(
  "street_segments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceEntryId: integer("source_entry_id")
      .references(() => sourceEntries.id)
      .notNull(),
    rueId: integer("rue_id")
      .references(() => rues.id)
      .notNull(),
    parity: text("parity", { enum: ["odd", "even"] }).notNull(),
    fromNumber: integer("from_number").notNull(),
    fromSuffixRank: integer("from_suffix_rank").notNull().default(0),
    toNumber: integer("to_number").notNull(),
    toSuffixRank: integer("to_suffix_rank").notNull().default(0),
    fromSuffix: text("from_suffix"),
    toSuffix: text("to_suffix"),
    notes: text("notes"),
  },
  (table) => [
    index("street_segments_source_entry_idx").on(table.sourceEntryId),
    index("street_segments_rue_range_idx").on(
      table.rueId,
      table.fromNumber,
      table.fromSuffixRank
    ),
    check(
      "street_segments_range_order_ok",
      sql`${table.fromNumber} < ${table.toNumber}
          OR (${table.fromNumber} = ${table.toNumber}
              AND ${table.fromSuffixRank} <= ${table.toSuffixRank})`
    ),
    check(
      "street_segments_parity_ok",
      sql`(${table.parity} = 'even'
              AND ${table.fromNumber} % 2 = 0
              AND ${table.toNumber} % 2 = 0)
          OR (${table.parity} = 'odd'
              AND ${table.fromNumber} % 2 = 1
              AND ${table.toNumber} % 2 = 1)`
    ),
  ]
);
