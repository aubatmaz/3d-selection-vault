CREATE TABLE `visit_daily` (
	`day` text PRIMARY KEY NOT NULL,
	`total` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visit_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_visit_sessions_day` ON `visit_sessions` (`day`);--> statement-breakpoint
CREATE TABLE `visit_totals` (
	`id` text PRIMARY KEY NOT NULL,
	`total` integer DEFAULT 0 NOT NULL
);
