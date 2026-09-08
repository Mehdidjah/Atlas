CREATE TABLE `meta_ad_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`meta_account_id` text NOT NULL,
	`account_id` text,
	`name` text NOT NULL,
	`account_status` integer,
	`currency` text,
	`timezone_name` text,
	`business_id` text,
	`business_name` text,
	`selected` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`connection_id`) REFERENCES `meta_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meta_ad_accounts_connection_account_idx` ON `meta_ad_accounts` (`connection_id`,`meta_account_id`);--> statement-breakpoint
CREATE INDEX `meta_ad_accounts_connection_idx` ON `meta_ad_accounts` (`connection_id`);--> statement-breakpoint
CREATE INDEX `meta_ad_accounts_selected_idx` ON `meta_ad_accounts` (`connection_id`,`selected`);--> statement-breakpoint
CREATE TABLE `meta_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`meta_user_id` text NOT NULL,
	`meta_user_name` text,
	`token_ciphertext` text NOT NULL,
	`token_iv` text NOT NULL,
	`token_expires_at` integer,
	`scopes` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_synced_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meta_connections_user_workspace_idx` ON `meta_connections` (`user_id`,`workspace_id`);--> statement-breakpoint
CREATE INDEX `meta_connections_user_idx` ON `meta_connections` (`user_id`);--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`return_to` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `oauth_states_user_idx` ON `oauth_states` (`user_id`);--> statement-breakpoint
CREATE INDEX `oauth_states_expiry_idx` ON `oauth_states` (`expires_at`);