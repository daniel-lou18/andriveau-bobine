CREATE TABLE `street_segments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rue_id` integer NOT NULL,
	`ilot_id` integer NOT NULL,
	`parity` text NOT NULL,
	`from_number` integer NOT NULL,
	`to_number` integer NOT NULL,
	`from_suffix` text,
	`to_suffix` text,
	`raw_range` text,
	`source_bobine` integer,
	`source_page` integer,
	`notes` text,
	FOREIGN KEY (`rue_id`) REFERENCES `rues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ilot_id`) REFERENCES `ilots`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "street_segments_range_ok" CHECK("street_segments"."from_number" <= "street_segments"."to_number")
);
--> statement-breakpoint
CREATE INDEX `street_segments_rue_range_idx` ON `street_segments` (`rue_id`,`from_number`,`to_number`);--> statement-breakpoint
CREATE INDEX `street_segments_ilot_idx` ON `street_segments` (`ilot_id`);--> statement-breakpoint
DROP INDEX `rues_name_normalized_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `rues_name_normalized_unique` ON `rues` (`name_normalized`);