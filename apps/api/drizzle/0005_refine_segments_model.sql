PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__segment_ilot_map` AS
SELECT `id` AS `segment_id`, `ilot_id`
FROM `street_segments`;
--> statement-breakpoint
CREATE TABLE `__new_street_segments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rue_id` integer NOT NULL,
	`parity` text NOT NULL,
	`from_number` integer NOT NULL,
	`from_suffix_rank` integer DEFAULT 0 NOT NULL,
	`to_number` integer NOT NULL,
	`to_suffix_rank` integer DEFAULT 0 NOT NULL,
	`from_suffix` text,
	`to_suffix` text,
	`raw_range` text,
	`source_bobine` integer,
	`source_page` integer,
	`notes` text,
	FOREIGN KEY (`rue_id`) REFERENCES `rues`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "street_segments_range_ok" CHECK(
		`from_number` < `to_number`
		OR (`from_number` = `to_number` AND `from_suffix_rank` <= `to_suffix_rank`)
	)
);
--> statement-breakpoint
INSERT INTO `__new_street_segments` (
	`id`,
	`rue_id`,
	`parity`,
	`from_number`,
	`from_suffix_rank`,
	`to_number`,
	`to_suffix_rank`,
	`from_suffix`,
	`to_suffix`,
	`raw_range`,
	`source_bobine`,
	`source_page`,
	`notes`
)
SELECT
	`id`,
	`rue_id`,
	CASE
		WHEN `parity` = 'odd' THEN 'odd'
		ELSE 'even'
	END,
	`from_number`,
	0,
	`to_number`,
	0,
	`from_suffix`,
	`to_suffix`,
	`raw_range`,
	`source_bobine`,
	`source_page`,
	`notes`
FROM `street_segments`;
--> statement-breakpoint
DROP TABLE `street_segments`;
--> statement-breakpoint
ALTER TABLE `__new_street_segments` RENAME TO `street_segments`;
--> statement-breakpoint
CREATE INDEX `street_segments_rue_range_idx` ON `street_segments` (`rue_id`,`from_number`,`from_suffix_rank`);
--> statement-breakpoint
CREATE TABLE `segment_ilots` (
	`segment_id` integer NOT NULL,
	`ilot_id` integer NOT NULL,
	PRIMARY KEY(`segment_id`, `ilot_id`),
	FOREIGN KEY (`segment_id`) REFERENCES `street_segments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ilot_id`) REFERENCES `ilots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `segment_ilots_ilot_idx` ON `segment_ilots` (`ilot_id`);
--> statement-breakpoint
INSERT INTO `segment_ilots` (`segment_id`, `ilot_id`)
SELECT `segment_id`, `ilot_id`
FROM `__segment_ilot_map`;
--> statement-breakpoint
DROP TABLE `__segment_ilot_map`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;