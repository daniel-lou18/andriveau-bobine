DROP INDEX `ilots_quartier_number_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `ilots_number_unique` ON `ilots` (`number`);