PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_segment_ilots` (
	`segment_id` integer NOT NULL,
	`ilot_id` integer NOT NULL,
	PRIMARY KEY(`segment_id`, `ilot_id`),
	FOREIGN KEY (`segment_id`) REFERENCES `street_segments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ilot_id`) REFERENCES `ilots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_segment_ilots`("segment_id", "ilot_id") SELECT "segment_id", "ilot_id" FROM `segment_ilots`;--> statement-breakpoint
DROP TABLE `segment_ilots`;--> statement-breakpoint
ALTER TABLE `__new_segment_ilots` RENAME TO `segment_ilots`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `segment_ilots_ilot_idx` ON `segment_ilots` (`ilot_id`);--> statement-breakpoint
CREATE TABLE `__new_street_segments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_entry_id` integer NOT NULL,
	`rue_id` integer NOT NULL,
	`parity` text NOT NULL,
	`from_number` integer NOT NULL,
	`from_suffix_rank` integer DEFAULT 0 NOT NULL,
	`to_number` integer NOT NULL,
	`to_suffix_rank` integer DEFAULT 0 NOT NULL,
	`from_suffix` text,
	`to_suffix` text,
	`type_inferred` integer DEFAULT false NOT NULL,
	`quality_flags` integer DEFAULT 0 NOT NULL,
	`notes` text,
	FOREIGN KEY (`source_entry_id`) REFERENCES `source_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rue_id`) REFERENCES `rues`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "street_segments_range_order_ok" CHECK("__new_street_segments"."from_number" < "__new_street_segments"."to_number"
          OR ("__new_street_segments"."from_number" = "__new_street_segments"."to_number"
              AND "__new_street_segments"."from_suffix_rank" <= "__new_street_segments"."to_suffix_rank")),
	CONSTRAINT "street_segments_parity_ok" CHECK(("__new_street_segments"."parity" = 'even'
              AND "__new_street_segments"."from_number" % 2 = 0
              AND "__new_street_segments"."to_number" % 2 = 0)
          OR ("__new_street_segments"."parity" = 'odd'
              AND "__new_street_segments"."from_number" % 2 = 1
              AND "__new_street_segments"."to_number" % 2 = 1))
);
--> statement-breakpoint
INSERT INTO `__new_street_segments`("id", "source_entry_id", "rue_id", "parity", "from_number", "from_suffix_rank", "to_number", "to_suffix_rank", "from_suffix", "to_suffix", "type_inferred", "quality_flags", "notes") SELECT "id", "source_entry_id", "rue_id", "parity", "from_number", "from_suffix_rank", "to_number", "to_suffix_rank", "from_suffix", "to_suffix", "type_inferred", "quality_flags", "notes" FROM `street_segments`;--> statement-breakpoint
DROP TABLE `street_segments`;--> statement-breakpoint
ALTER TABLE `__new_street_segments` RENAME TO `street_segments`;--> statement-breakpoint
CREATE INDEX `street_segments_source_entry_idx` ON `street_segments` (`source_entry_id`);--> statement-breakpoint
CREATE INDEX `street_segments_rue_range_idx` ON `street_segments` (`rue_id`,`from_number`,`from_suffix_rank`);--> statement-breakpoint
CREATE TRIGGER `segment_ilots_quartier_consistency`
BEFORE INSERT ON `segment_ilots`
FOR EACH ROW
WHEN (
	(SELECT se.`quartier_id`
		FROM `street_segments` s
		JOIN `source_entries` se ON se.`id` = s.`source_entry_id`
		WHERE s.`id` = NEW.`segment_id`)
	!=
	(SELECT i.`quartier_id` FROM `ilots` i WHERE i.`id` = NEW.`ilot_id`)
)
BEGIN
	SELECT RAISE(ABORT, 'segment_ilots: ilot must share the source entry''s quartier');
END;
