CREATE TABLE `chat_sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`history` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL
);
