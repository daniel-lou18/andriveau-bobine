CREATE TABLE `arrondissements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` integer NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `arrondissements_number_unique` ON `arrondissements` (`number`);--> statement-breakpoint
CREATE TABLE `ilots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quartier_id` integer NOT NULL,
	`number` integer NOT NULL,
	FOREIGN KEY (`quartier_id`) REFERENCES `quartiers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ilots_quartier_number_unique` ON `ilots` (`quartier_id`,`number`);--> statement-breakpoint
CREATE TABLE `quartiers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`arrondissement_id` integer NOT NULL,
	`name` text NOT NULL,
	`name_normalized` text NOT NULL,
	FOREIGN KEY (`arrondissement_id`) REFERENCES `arrondissements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quartiers_arr_normalized_unique` ON `quartiers` (`arrondissement_id`,`name_normalized`);--> statement-breakpoint
CREATE TABLE `rues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`name_normalized` text NOT NULL
);
