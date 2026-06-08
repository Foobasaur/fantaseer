BEGIN;

-- =====================================================================
-- PHASE 1 — TABLES
-- =====================================================================
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp
);

CREATE TABLE "identities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"userId" uuid NOT NULL,
	"platform" text NOT NULL,
	"platformId" text NOT NULL,
	CONSTRAINT "identities_platform_platformId_unique" UNIQUE("platform","platformId")
);

CREATE TABLE "player" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"identityId" integer NOT NULL UNIQUE
);

CREATE TABLE "viewer" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"identityId" integer NOT NULL UNIQUE
);

CREATE TABLE "game" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"name" text NOT NULL UNIQUE,
	"code" text NOT NULL UNIQUE,
	"description" text DEFAULT 'Foobasaurous is too lazy to write one.'
);

CREATE TABLE "game_category" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"gameId" integer NOT NULL,
	"mode" text NOT NULL,
	CONSTRAINT "game_category_gameId_mode_unique" UNIQUE("gameId","mode")
);

CREATE TABLE "player_event" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"categoryId" integer NOT NULL,
	"playerId" integer NOT NULL,
	"eventable" text NOT NULL,
	"pickable" text NOT NULL
);

CREATE TABLE "player_pickaroo" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"categoryId" integer NOT NULL,
	"playerId" integer NOT NULL,
	"eventable" text NOT NULL,
	"pickables" jsonb NOT NULL,
	"outcomeId" integer
);

CREATE TABLE "banned" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"playerId" integer NOT NULL,
	"viewerId" integer NOT NULL,
	"reason" text,
	CONSTRAINT "banned_playerId_viewerId_unique" UNIQUE("playerId","viewerId")
);

CREATE TABLE "viewer_draft" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"categoryId" integer NOT NULL,
	"viewerId" integer NOT NULL,
	"playerId" integer NOT NULL
);

CREATE TABLE "viewer_draft_pick" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"draftId" integer NOT NULL,
	"pickable" text NOT NULL,
	CONSTRAINT "viewer_draft_pick_draftId_pickable_unique" UNIQUE("draftId","pickable")
);

CREATE TABLE "viewer_events_observer" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"viewerId" integer NOT NULL,
	"eventId" integer NOT NULL,
	CONSTRAINT "viewer_events_observer_viewerId_eventId_unique" UNIQUE("viewerId","eventId")
);

CREATE TABLE "viewer_pickaroo_pick" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
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

-- =====================================================================
-- PHASE 2 — INDEXES  (incl. the partial ones drizzle-kit push drops)
-- =====================================================================
CREATE INDEX "identities_userId_index" ON "identities" ("userId");
CREATE INDEX "player_event_eventable_pickable_index" ON "player_event" ("eventable","pickable");
CREATE INDEX "player_event_playerId_categoryId_pickable_index" ON "player_event" ("playerId","categoryId","pickable");
-- ARBITER for ON CONFLICT (categoryId, playerId, eventable) WHERE outcomeId IS NULL
CREATE UNIQUE INDEX "player_pickaroo_categoryId_playerId_eventable_index" ON "player_pickaroo" ("categoryId","playerId","eventable") WHERE "outcomeId" IS NULL;
CREATE INDEX "player_pickaroo_playerId_categoryId_index" ON "player_pickaroo" ("playerId","categoryId");
CREATE INDEX "player_pickaroo_pickables_index" ON "player_pickaroo" USING gin ("pickables") WHERE "outcomeId" IS NULL;
CREATE INDEX "player_pickaroo_outcomeId_index" ON "player_pickaroo" ("outcomeId") WHERE "outcomeId" IS NOT NULL;
CREATE INDEX "viewer_draft_viewerId_categoryId_index" ON "viewer_draft" ("viewerId","categoryId");
CREATE INDEX "viewer_draft_categoryId_index" ON "viewer_draft" ("categoryId");
CREATE INDEX "viewer_draft_pick_pickable_index" ON "viewer_draft_pick" ("pickable");
CREATE INDEX "viewer_events_observer_eventId_index" ON "viewer_events_observer" ("eventId");
CREATE INDEX "viewer_pickaroo_pick_viewerId_index" ON "viewer_pickaroo_pick" ("viewerId");
CREATE INDEX "viewer_pickaroo_pick_pickarooId_index" ON "viewer_pickaroo_pick" ("pickarooId");

-- =====================================================================
-- PHASE 3 — FOREIGN KEYS
-- =====================================================================
ALTER TABLE "identities" ADD CONSTRAINT "identities_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "player" ADD CONSTRAINT "player_identityId_identities_id_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE;
ALTER TABLE "viewer" ADD CONSTRAINT "viewer_identityId_identities_id_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE;
ALTER TABLE "banned" ADD CONSTRAINT "banned_playerId_player_id_fkey" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE;
ALTER TABLE "banned" ADD CONSTRAINT "banned_viewerId_viewer_id_fkey" FOREIGN KEY ("viewerId") REFERENCES "viewer"("id") ON DELETE CASCADE;
ALTER TABLE "game_category" ADD CONSTRAINT "game_category_gameId_game_id_fkey" FOREIGN KEY ("gameId") REFERENCES "game"("id") ON DELETE CASCADE;
ALTER TABLE "player_event" ADD CONSTRAINT "player_event_categoryId_game_category_id_fkey" FOREIGN KEY ("categoryId") REFERENCES "game_category"("id") ON DELETE CASCADE;
ALTER TABLE "player_event" ADD CONSTRAINT "player_event_playerId_player_id_fkey" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE;
ALTER TABLE "player_pickaroo" ADD CONSTRAINT "player_pickaroo_categoryId_game_category_id_fkey" FOREIGN KEY ("categoryId") REFERENCES "game_category"("id") ON DELETE CASCADE;
ALTER TABLE "player_pickaroo" ADD CONSTRAINT "player_pickaroo_playerId_player_id_fkey" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE;
ALTER TABLE "player_pickaroo" ADD CONSTRAINT "player_pickaroo_outcomeId_player_event_id_fkey" FOREIGN KEY ("outcomeId") REFERENCES "player_event"("id") ON DELETE CASCADE;
ALTER TABLE "viewer_draft" ADD CONSTRAINT "viewer_draft_categoryId_game_category_id_fkey" FOREIGN KEY ("categoryId") REFERENCES "game_category"("id") ON DELETE CASCADE;
ALTER TABLE "viewer_draft" ADD CONSTRAINT "viewer_draft_viewerId_viewer_id_fkey" FOREIGN KEY ("viewerId") REFERENCES "viewer"("id") ON DELETE CASCADE;
ALTER TABLE "viewer_draft" ADD CONSTRAINT "viewer_draft_playerId_player_id_fkey" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE;
ALTER TABLE "viewer_draft_pick" ADD CONSTRAINT "viewer_draft_pick_draftId_viewer_draft_id_fkey" FOREIGN KEY ("draftId") REFERENCES "viewer_draft"("id") ON DELETE CASCADE;
ALTER TABLE "viewer_events_observer" ADD CONSTRAINT "viewer_events_observer_viewerId_viewer_id_fkey" FOREIGN KEY ("viewerId") REFERENCES "viewer"("id") ON DELETE CASCADE;
ALTER TABLE "viewer_events_observer" ADD CONSTRAINT "viewer_events_observer_eventId_player_event_id_fkey" FOREIGN KEY ("eventId") REFERENCES "player_event"("id") ON DELETE CASCADE;
ALTER TABLE "viewer_pickaroo_pick" ADD CONSTRAINT "viewer_pickaroo_pick_categoryId_game_category_id_fkey" FOREIGN KEY ("categoryId") REFERENCES "game_category"("id") ON DELETE CASCADE;
ALTER TABLE "viewer_pickaroo_pick" ADD CONSTRAINT "viewer_pickaroo_pick_playerId_player_id_fkey" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE;
ALTER TABLE "viewer_pickaroo_pick" ADD CONSTRAINT "viewer_pickaroo_pick_viewerId_viewer_id_fkey" FOREIGN KEY ("viewerId") REFERENCES "viewer"("id") ON DELETE CASCADE;
ALTER TABLE "viewer_pickaroo_pick" ADD CONSTRAINT "viewer_pickaroo_pick_pickarooId_player_pickaroo_id_fkey" FOREIGN KEY ("pickarooId") REFERENCES "player_pickaroo"("id") ON DELETE CASCADE;

COMMIT;