PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_inspection_items` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`condition_status` text NOT NULL,
	`description` text,
	`ai_damage_detected` integer DEFAULT false NOT NULL,
	`ai_damage_summary` text,
	`ai_confidence_score` real,
	`local_uri` text,
	`remote_url` text,
	`thumbnail_uri` text,
	`thumbnail_url` text,
	`latitude` real,
	`longitude` real,
	`altitude` real,
	`heading` real,
	`captured_at` integer NOT NULL,
	`image_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`synced_at` integer,
	FOREIGN KEY (`room_id`) REFERENCES `inspection_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_inspection_items`("id", "room_id", "user_id", "title", "condition_status", "description", "ai_damage_detected", "ai_damage_summary", "ai_confidence_score", "local_uri", "remote_url", "thumbnail_uri", "thumbnail_url", "latitude", "longitude", "altitude", "heading", "captured_at", "image_hash", "created_at", "updated_at", "deleted_at", "synced_at") SELECT "id", "room_id", "user_id", "title", "condition_status", "description", "ai_damage_detected", "ai_damage_summary", "ai_confidence_score", "local_uri", "remote_url", "thumbnail_uri", "thumbnail_url", "latitude", "longitude", "altitude", "heading", "captured_at", "image_hash", "created_at", "updated_at", "deleted_at", "synced_at" FROM `inspection_items`;--> statement-breakpoint
DROP TABLE `inspection_items`;--> statement-breakpoint
ALTER TABLE `__new_inspection_items` RENAME TO `inspection_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `items_room_idx` ON `inspection_items` (`room_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `items_user_idx` ON `inspection_items` (`user_id`,`deleted_at`);