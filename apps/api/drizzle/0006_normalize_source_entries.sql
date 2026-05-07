PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `source_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bobine` integer NOT NULL,
	`page` integer NOT NULL,
	`raw_text` text NOT NULL,
	`sequence` integer,
	`notes` text
);
--> statement-breakpoint
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
	`notes` text,
	FOREIGN KEY (`source_entry_id`) REFERENCES `source_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rue_id`) REFERENCES `rues`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "street_segments_range_ok" CHECK(
		`from_number` < `to_number`
		OR (`from_number` = `to_number` AND `from_suffix_rank` <= `to_suffix_rank`)
	)
);
--> statement-breakpoint
INSERT INTO `source_entries` (`bobine`, `page`, `raw_text`)
SELECT DISTINCT
	COALESCE(`source_bobine`, 0),
	COALESCE(`source_page`, 0),
	COALESCE(`raw_range`, '')
FROM `street_segments`;
--> statement-breakpoint
INSERT INTO `__new_street_segments` (
	`id`,
	`source_entry_id`,
	`rue_id`,
	`parity`,
	`from_number`,
	`from_suffix_rank`,
	`to_number`,
	`to_suffix_rank`,
	`from_suffix`,
	`to_suffix`,
	`notes`
)
SELECT
	s.`id`,
	se.`id`,
	s.`rue_id`,
	s.`parity`,
	s.`from_number`,
	s.`from_suffix_rank`,
	s.`to_number`,
	s.`to_suffix_rank`,
	s.`from_suffix`,
	s.`to_suffix`,
	s.`notes`
FROM `street_segments` s
JOIN `source_entries` se
  ON se.`bobine` = COALESCE(s.`source_bobine`, 0)
 AND se.`page` = COALESCE(s.`source_page`, 0)
 AND se.`raw_text` = COALESCE(s.`raw_range`, '');
--> statement-breakpoint
DROP TABLE `street_segments`;
--> statement-breakpoint
ALTER TABLE `__new_street_segments` RENAME TO `street_segments`;
--> statement-breakpoint
CREATE INDEX `street_segments_source_entry_idx` ON `street_segments` (`source_entry_id`);
--> statement-breakpoint
CREATE INDEX `street_segments_rue_range_idx` ON `street_segments` (`rue_id`,`from_number`,`from_suffix_rank`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;