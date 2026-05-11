-- 1) Rebuild `rues`: `type` text -> `type_id` FK -> `voie_types`.
-- 2) Rebuild `source_entries`: add `quartier_id` (defaults to first row in `quartiers`; seed quartiers before migrating).
-- 3) Rebuild `street_segments`: replace `street_segments_range_ok` with `street_segments_range_order_ok` + `street_segments_parity_ok`.
-- 4) Recreate `segment_ilots` from backup (FK target was rebuilt).
-- 5) `segment_ilots_quartier_consistency` BEFORE INSERT trigger.
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
DROP INDEX IF EXISTS `rues_type_libelle_normalized_unique`;
--> statement-breakpoint
DROP INDEX IF EXISTS `rues_libelle_normalized_idx`;
--> statement-breakpoint
CREATE TABLE `__new_rues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type_id` integer NOT NULL,
	`libelle` text NOT NULL,
	`libelle_normalized` text NOT NULL,
	FOREIGN KEY (`type_id`) REFERENCES `voie_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_rues` (`id`, `type_id`, `libelle`, `libelle_normalized`)
SELECT
	r.`id`,
	COALESCE(
		(
			SELECT vt.`id`
			FROM `voie_types` vt
			WHERE vt.`code` = CASE trim(r.`type`)
				WHEN 'Rue' THEN 'rue'
				WHEN 'Avenue' THEN 'avenue'
				WHEN 'Boulevard' THEN 'boulevard'
				WHEN 'Place' THEN 'place'
				WHEN 'Quai' THEN 'quai'
				WHEN 'Cours' THEN 'cours'
				WHEN 'Allée' THEN 'allée'
				WHEN 'Impasse' THEN 'impasse'
				WHEN 'Passage' THEN 'passage'
				WHEN 'Square' THEN 'square'
				WHEN 'Villa' THEN 'villa'
				WHEN 'Cité' THEN 'cite'
				WHEN 'Galerie' THEN 'galerie'
				WHEN 'Pont' THEN 'pont'
				WHEN 'Esplanade' THEN 'esplanade'
				WHEN 'Carrefour' THEN 'carrefour'
				ELSE lower(trim(r.`type`))
			END
			LIMIT 1
		),
		(SELECT `id` FROM `voie_types` WHERE `code` = 'rue' LIMIT 1)
	) AS `type_id`,
	r.`libelle`,
	r.`libelle_normalized`
FROM `rues` r;
--> statement-breakpoint
DROP TABLE `rues`;
--> statement-breakpoint
ALTER TABLE `__new_rues` RENAME TO `rues`;
--> statement-breakpoint
CREATE UNIQUE INDEX `rues_type_libelle_normalized_unique` ON `rues` (`type_id`,`libelle_normalized`);
--> statement-breakpoint
CREATE INDEX `rues_libelle_normalized_idx` ON `rues` (`libelle_normalized`);
--> statement-breakpoint
CREATE TABLE `__new_source_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quartier_id` integer NOT NULL,
	`bobine` integer NOT NULL,
	`page` integer NOT NULL,
	`raw_text` text NOT NULL,
	`sequence` integer,
	`notes` text,
	FOREIGN KEY (`quartier_id`) REFERENCES `quartiers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_source_entries` (
	`id`,
	`quartier_id`,
	`bobine`,
	`page`,
	`raw_text`,
	`sequence`,
	`notes`
)
SELECT
	se.`id`,
	COALESCE((SELECT q.`id` FROM `quartiers` q ORDER BY q.`id` LIMIT 1), 1) AS `quartier_id`,
	se.`bobine`,
	se.`page`,
	se.`raw_text`,
	se.`sequence`,
	se.`notes`
FROM `source_entries` se;
--> statement-breakpoint
CREATE TABLE `__segment_ilot_backup` AS
SELECT `segment_id`, `ilot_id` FROM `segment_ilots`;
--> statement-breakpoint
DROP TABLE `segment_ilots`;
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
	CONSTRAINT `street_segments_range_order_ok` CHECK(
		`from_number` < `to_number`
		OR (`from_number` = `to_number` AND `from_suffix_rank` <= `to_suffix_rank`)
	),
	CONSTRAINT `street_segments_parity_ok` CHECK(
		(`parity` = 'even' AND `from_number` % 2 = 0 AND `to_number` % 2 = 0)
		OR (`parity` = 'odd' AND `from_number` % 2 = 1 AND `to_number` % 2 = 1)
	)
);
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
	s.`source_entry_id`,
	s.`rue_id`,
	s.`parity`,
	s.`from_number`,
	s.`from_suffix_rank`,
	s.`to_number`,
	s.`to_suffix_rank`,
	s.`from_suffix`,
	s.`to_suffix`,
	s.`notes`
FROM `street_segments` s;
--> statement-breakpoint
DROP TABLE `street_segments`;
--> statement-breakpoint
ALTER TABLE `__new_street_segments` RENAME TO `street_segments`;
--> statement-breakpoint
CREATE INDEX `street_segments_source_entry_idx` ON `street_segments` (`source_entry_id`);
--> statement-breakpoint
CREATE INDEX `street_segments_rue_range_idx` ON `street_segments` (`rue_id`,`from_number`,`from_suffix_rank`);
--> statement-breakpoint
DROP TABLE `source_entries`;
--> statement-breakpoint
ALTER TABLE `__new_source_entries` RENAME TO `source_entries`;
--> statement-breakpoint
CREATE TABLE `segment_ilots` (
	`segment_id` integer NOT NULL,
	`ilot_id` integer NOT NULL,
	PRIMARY KEY(`segment_id`, `ilot_id`),
	FOREIGN KEY (`segment_id`) REFERENCES `street_segments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ilot_id`) REFERENCES `ilots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `segment_ilots` (`segment_id`, `ilot_id`)
SELECT `segment_id`, `ilot_id` FROM `__segment_ilot_backup`;
--> statement-breakpoint
CREATE INDEX `segment_ilots_ilot_idx` ON `segment_ilots` (`ilot_id`);
--> statement-breakpoint
DROP TABLE `__segment_ilot_backup`;
--> statement-breakpoint
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
--> statement-breakpoint
PRAGMA foreign_keys=ON;
