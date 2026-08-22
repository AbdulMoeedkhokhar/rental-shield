CREATE TABLE `inspection_items` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`condition_status` text NOT NULL,
	`description` text,
	`ai_damage_detected` integer DEFAULT false NOT NULL,
	`ai_damage_summary` text,
	`ai_confidence_score` real,
	`local_uri` text NOT NULL,
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
CREATE INDEX `items_room_idx` ON `inspection_items` (`room_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `items_user_idx` ON `inspection_items` (`user_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `inspection_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`inspection_id` text NOT NULL,
	`room_name` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`synced_at` integer,
	FOREIGN KEY (`inspection_id`) REFERENCES `inspections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rooms_inspection_idx` ON `inspection_rooms` (`inspection_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`user_id` text NOT NULL,
	`inspection_type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`lease_start_date` integer,
	`tenant_signature_uri` text,
	`tenant_signature_url` text,
	`landlord_signature_uri` text,
	`landlord_signature_url` text,
	`pdf_report_url` text,
	`report_hash` text,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`synced_at` integer,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `inspections_property_idx` ON `inspections` (`property_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`op` text NOT NULL,
	`payload` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL,
	`available_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `outbox_ready_idx` ON `outbox` (`available_at`,`id`);--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`address_line1` text NOT NULL,
	`address_line2` text,
	`city` text NOT NULL,
	`state_province` text,
	`postal_code` text,
	`property_type` text DEFAULT 'Apartment' NOT NULL,
	`landlord_name` text,
	`landlord_email` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`synced_at` integer
);
--> statement-breakpoint
CREATE INDEX `properties_user_idx` ON `properties` (`user_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `user_state` (
	`user_id` text PRIMARY KEY NOT NULL,
	`is_pro` integer DEFAULT false NOT NULL,
	`server_property_count` integer DEFAULT 0 NOT NULL,
	`server_photo_count` integer DEFAULT 0 NOT NULL,
	`entitlement_checked_at` integer,
	`sync_cursor` text,
	`updated_at` integer DEFAULT 0 NOT NULL
);
