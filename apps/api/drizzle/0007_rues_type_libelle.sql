PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_rues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`libelle` text NOT NULL,
	`libelle_normalized` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_rues` (`id`, `type`, `libelle`, `libelle_normalized`)
SELECT
	r.`id`,
	CASE
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) IN ('rue', 'r') THEN 'Rue'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) IN ('av', 'avenue') THEN 'Avenue'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) IN ('bd', 'bld', 'boulevard') THEN 'Boulevard'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) IN ('pl', 'place') THEN 'Place'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) = 'quai' THEN 'Quai'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) = 'cours' THEN 'Cours'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) IN ('allee', 'all') THEN 'Allée'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) = 'impasse' THEN 'Impasse'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) = 'passage' THEN 'Passage'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) = 'square' THEN 'Square'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) = 'villa' THEN 'Villa'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) = 'cite' THEN 'Cité'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) = 'galerie' THEN 'Galerie'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) = 'pont' THEN 'Pont'
		WHEN lower(replace(replace(replace(trim(CASE WHEN instr(r.`name`, ' ') > 0 THEN substr(r.`name`, 1, instr(r.`name`, ' ') - 1) ELSE r.`name` END), '.', ''), '''', ''), '’', '')) = 'esplanade' THEN 'Esplanade'
		ELSE 'Rue'
	END AS `type`,
	CASE
		WHEN instr(trim(r.`name`), ' ') > 0 THEN trim(substr(trim(r.`name`), instr(trim(r.`name`), ' ') + 1))
		ELSE trim(r.`name`)
	END AS `libelle`,
	CASE
		WHEN instr(trim(r.`name_normalized`), ' ') > 0 THEN trim(substr(trim(r.`name_normalized`), instr(trim(r.`name_normalized`), ' ') + 1))
		ELSE trim(r.`name_normalized`)
	END AS `libelle_normalized`
FROM `rues` r;
--> statement-breakpoint
DROP TABLE `rues`;
--> statement-breakpoint
ALTER TABLE `__new_rues` RENAME TO `rues`;
--> statement-breakpoint
CREATE UNIQUE INDEX `rues_type_libelle_normalized_unique` ON `rues` (`type`,`libelle_normalized`);
--> statement-breakpoint
CREATE INDEX `rues_libelle_normalized_idx` ON `rues` (`libelle_normalized`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;