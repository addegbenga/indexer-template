CREATE TABLE IF NOT EXISTS "assets" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"collection_id" varchar(255) NOT NULL,
	"owner" varchar(255) NOT NULL,
	"token_uri" text,
	"minted_at_block" bigint NOT NULL,
	"indexer_source" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collections" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"creator" varchar(255) NOT NULL,
	"metadata_uri" text,
	"created_at_block" bigint NOT NULL,
	"indexer_source" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cursor_table" (
	"id" text PRIMARY KEY NOT NULL,
	"end_cursor" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transfers" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"token_id" varchar(255) NOT NULL,
	"from" varchar(255) NOT NULL,
	"to" varchar(255) NOT NULL,
	"block" bigint NOT NULL,
	"indexer_source" varchar(50) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assets" ADD CONSTRAINT "assets_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfers" ADD CONSTRAINT "transfers_token_id_assets_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
