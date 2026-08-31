CREATE TABLE `vault_state` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`catalogue` text NOT NULL,
	`updated_by` text NOT NULL
);
