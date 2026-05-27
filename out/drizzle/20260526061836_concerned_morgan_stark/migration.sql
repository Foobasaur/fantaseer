CREATE TABLE "banned" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "banned_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"playerId" integer NOT NULL,
	"viewerId" integer NOT NULL,
	"reason" text,
	CONSTRAINT "banned_playerId_viewerId_unique" UNIQUE("playerId","viewerId")
);
--> statement-breakpoint
CREATE TABLE "game_category" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_category_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"gameId" integer NOT NULL,
	"mode" text NOT NULL,
	CONSTRAINT "game_category_gameId_mode_unique" UNIQUE("gameId","mode")
);
--> statement-breakpoint
CREATE TABLE "viewer_draft" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "viewer_draft_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"categoryId" integer NOT NULL,
	"viewerId" integer NOT NULL,
	"playerId" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_event" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "player_event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"categoryId" integer NOT NULL,
	"playerId" integer NOT NULL,
	"eventable" text NOT NULL,
	"pickable" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"name" text NOT NULL UNIQUE,
	"code" text NOT NULL UNIQUE,
	"description" text DEFAULT 'meta stoned'
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "identities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"userId" uuid NOT NULL,
	"platform" text NOT NULL,
	"platformId" text NOT NULL,
	CONSTRAINT "identities_platform_platformId_unique" UNIQUE("platform","platformId")
);
--> statement-breakpoint
CREATE TABLE "viewer_events_observer" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "viewer_events_observer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"viewerId" integer NOT NULL,
	"eventId" integer NOT NULL,
	CONSTRAINT "viewer_events_observer_viewerId_eventId_unique" UNIQUE("viewerId","eventId")
);
--> statement-breakpoint
CREATE TABLE "player_pickaroo" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "player_pickaroo_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"categoryId" integer NOT NULL,
	"playerId" integer NOT NULL,
	"eventable" text NOT NULL,
	"pickables" jsonb NOT NULL,
	"outcomeId" integer
);
--> statement-breakpoint
CREATE TABLE "viewer_pickaroo_pick" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "viewer_pickaroo_pick_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"categoryId" integer NOT NULL,
	"playerId" integer NOT NULL,
	"viewerId" integer NOT NULL,
	"pickarooId" integer NOT NULL,
	"pickable" text NOT NULL,
	CONSTRAINT "viewer_pickaroo_pick_viewerId_pickarooId_unique" UNIQUE("viewerId","pickarooId")
);
--> statement-breakpoint
CREATE TABLE "viewer_draft_pick" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "viewer_draft_pick_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"draftId" integer NOT NULL,
	"pickable" text NOT NULL,
	CONSTRAINT "viewer_draft_pick_draftId_pickable_unique" UNIQUE("draftId","pickable")
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "player_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"identityId" integer NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "viewer" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "viewer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"identityId" integer NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE INDEX "viewer_draft_viewerId_categoryId_index" ON "viewer_draft" ("viewerId","categoryId");--> statement-breakpoint
CREATE INDEX "viewer_draft_categoryId_index" ON "viewer_draft" ("categoryId");--> statement-breakpoint
CREATE INDEX "player_event_eventable_pickable_index" ON "player_event" ("eventable","pickable");--> statement-breakpoint
CREATE INDEX "player_event_playerId_categoryId_pickable_index" ON "player_event" ("playerId","categoryId","pickable");--> statement-breakpoint
CREATE INDEX "identities_userId_index" ON "identities" ("userId");--> statement-breakpoint
CREATE INDEX "viewer_events_observer_eventId_index" ON "viewer_events_observer" ("eventId");--> statement-breakpoint
CREATE UNIQUE INDEX "player_pickaroo_categoryId_playerId_eventable_index" ON "player_pickaroo" ("categoryId","playerId","eventable") WHERE "outcomeId" IS NULL;--> statement-breakpoint
CREATE INDEX "player_pickaroo_playerId_categoryId_index" ON "player_pickaroo" ("playerId","categoryId");--> statement-breakpoint
CREATE INDEX "player_pickaroo_pickables_index" ON "player_pickaroo" USING gin ("pickables") WHERE "outcomeId" IS NULL;--> statement-breakpoint
CREATE INDEX "player_pickaroo_outcomeId_index" ON "player_pickaroo" ("outcomeId") WHERE "outcomeId" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "viewer_pickaroo_pick_viewerId_index" ON "viewer_pickaroo_pick" ("viewerId");--> statement-breakpoint
CREATE INDEX "viewer_pickaroo_pick_pickarooId_index" ON "viewer_pickaroo_pick" ("pickarooId");--> statement-breakpoint
CREATE INDEX "viewer_draft_pick_pickable_index" ON "viewer_draft_pick" ("pickable");--> statement-breakpoint
ALTER TABLE "banned" ADD CONSTRAINT "banned_playerId_player_id_fkey" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "banned" ADD CONSTRAINT "banned_viewerId_viewer_id_fkey" FOREIGN KEY ("viewerId") REFERENCES "viewer"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "game_category" ADD CONSTRAINT "game_category_gameId_game_id_fkey" FOREIGN KEY ("gameId") REFERENCES "game"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "viewer_draft" ADD CONSTRAINT "viewer_draft_categoryId_game_category_id_fkey" FOREIGN KEY ("categoryId") REFERENCES "game_category"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "viewer_draft" ADD CONSTRAINT "viewer_draft_viewerId_viewer_id_fkey" FOREIGN KEY ("viewerId") REFERENCES "viewer"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "viewer_draft" ADD CONSTRAINT "viewer_draft_playerId_player_id_fkey" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player_event" ADD CONSTRAINT "player_event_categoryId_game_category_id_fkey" FOREIGN KEY ("categoryId") REFERENCES "game_category"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player_event" ADD CONSTRAINT "player_event_playerId_player_id_fkey" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "viewer_events_observer" ADD CONSTRAINT "viewer_events_observer_viewerId_viewer_id_fkey" FOREIGN KEY ("viewerId") REFERENCES "viewer"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "viewer_events_observer" ADD CONSTRAINT "viewer_events_observer_eventId_player_event_id_fkey" FOREIGN KEY ("eventId") REFERENCES "player_event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player_pickaroo" ADD CONSTRAINT "player_pickaroo_categoryId_game_category_id_fkey" FOREIGN KEY ("categoryId") REFERENCES "game_category"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player_pickaroo" ADD CONSTRAINT "player_pickaroo_playerId_player_id_fkey" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player_pickaroo" ADD CONSTRAINT "player_pickaroo_outcomeId_player_event_id_fkey" FOREIGN KEY ("outcomeId") REFERENCES "player_event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "viewer_pickaroo_pick" ADD CONSTRAINT "viewer_pickaroo_pick_categoryId_game_category_id_fkey" FOREIGN KEY ("categoryId") REFERENCES "game_category"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "viewer_pickaroo_pick" ADD CONSTRAINT "viewer_pickaroo_pick_playerId_player_id_fkey" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "viewer_pickaroo_pick" ADD CONSTRAINT "viewer_pickaroo_pick_viewerId_viewer_id_fkey" FOREIGN KEY ("viewerId") REFERENCES "viewer"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "viewer_pickaroo_pick" ADD CONSTRAINT "viewer_pickaroo_pick_pickarooId_player_pickaroo_id_fkey" FOREIGN KEY ("pickarooId") REFERENCES "player_pickaroo"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "viewer_draft_pick" ADD CONSTRAINT "viewer_draft_pick_draftId_viewer_draft_id_fkey" FOREIGN KEY ("draftId") REFERENCES "viewer_draft"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_identityId_identities_id_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "viewer" ADD CONSTRAINT "viewer_identityId_identities_id_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE;