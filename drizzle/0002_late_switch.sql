ALTER TABLE `inspections` ADD `tenant_signature` text;--> statement-breakpoint
ALTER TABLE `inspections` ADD `tenant_signed_at` integer;--> statement-breakpoint
ALTER TABLE `inspections` ADD `tenant_signer_name` text;--> statement-breakpoint
ALTER TABLE `inspections` ADD `landlord_signature` text;--> statement-breakpoint
ALTER TABLE `inspections` ADD `landlord_signed_at` integer;--> statement-breakpoint
ALTER TABLE `inspections` ADD `landlord_signer_name` text;