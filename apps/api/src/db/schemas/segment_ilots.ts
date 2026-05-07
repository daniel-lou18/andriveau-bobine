import { index, integer, primaryKey, sqliteTable } from "drizzle-orm/sqlite-core";
import { ilots } from "./ilots";
import { streetSegments } from "./street_segments";

export const segmentIlots = sqliteTable(
  "segment_ilots",
  {
    segmentId: integer("segment_id")
      .references(() => streetSegments.id)
      .notNull(),
    ilotId: integer("ilot_id")
      .references(() => ilots.id)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.segmentId, table.ilotId] }),
    index("segment_ilots_ilot_idx").on(table.ilotId),
  ]
);
