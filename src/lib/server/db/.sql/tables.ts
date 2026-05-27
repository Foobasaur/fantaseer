import { sql } from 'drizzle-orm';
import type * as PG from 'drizzle-orm/pg-core';
import * as pg from 'drizzle-orm/pg-core';

/** Factorial utility funks */
// Create common columns
const timestamps = {
  createdAt: pg.timestamp().notNull().defaultNow(),
  updatedAt: pg.timestamp()
};
// Helper to define tables with common columns
const table = <TTableName extends string, TColumnsMap extends Record<string, PG.AnyPgColumnBuilder>>(
  name: TTableName,
  columns: TColumnsMap
) => {
  const colmons = {
    id: pg.integer().primaryKey().generatedAlwaysAsIdentity(),
    meta: pg.jsonb(),
    ...timestamps,
    ...columns
  };
  return (extra?: (self: PG.PgBuildExtraConfigColumns<typeof colmons>) => PG.PgTableExtraConfigValue[]) =>
    pg.pgTable(name, colmons, extra as any);
};

// Helper to define foreign key references
const references = (column: pg.PgColumn) =>
  pg
    .integer()
    .notNull()
    .references(() => column, { onDelete: 'cascade' });
// ============================================

/** User table */
export const users = pg.pgTable('user', { id: pg.uuid().primaryKey().defaultRandom(), ...timestamps });
export const identities = table('identities', {
  userId: pg
    .uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  platform: pg.text().notNull(),
  platformId: pg.text().notNull()
})(t => [pg.unique().on(t.platform, t.platformId), pg.index().on(t.userId)]);

const identity = (name: string) =>
  table(name, { identityId: references(identities.id) })(t => [pg.unique().on(t.identityId)]);
export const players = identity('player');
export const viewers = identity('viewer');
export const banned = table('banned', {
  playerId: references(players.id),
  viewerId: references(viewers.id),
  reason: pg.text()
})(t => [pg.unique().on(t.playerId, t.viewerId)]);

/** app */
export const games = table('game', {
  name: pg.text().notNull().unique(),
  code: pg.text().notNull().unique(),
  description: pg.text().default('Foobasaurous is too lazy to write one.'),
})();
export const categories = table('game_category', {
  gameId: references(games.id),
  mode: pg.text().notNull()
})(t => [pg.unique().on(t.gameId, t.mode)]);

// ==============================
// role: player
// ==============================

export const events = table('player_event', {
  categoryId: references(categories.id),
  playerId: references(players.id),
  eventable: pg.text().notNull(),
  pickable: pg.text().notNull()
})(t => [pg.index().on(t.eventable, t.pickable), pg.index().on(t.playerId, t.categoryId, t.pickable)]);

export const pickaroos = table('player_pickaroo', {
  categoryId: references(categories.id),
  playerId: references(players.id),
  eventable: pg.text().notNull(),
  pickables: pg.jsonb().$type<string[]>().notNull(),
  outcomeId: pg.integer().references(() => events.id, { onDelete: 'cascade' })
})(t => [
  pg
  .uniqueIndex()
  .on(t.categoryId, t.playerId, t.eventable)
  .where(sql`${t.outcomeId} IS NULL`),
  pg.index().on(t.playerId, t.categoryId),
  pg
    .index()
    .using('gin', t.pickables)
    .where(sql`${t.outcomeId} IS NULL`),
  pg
    .index()
    .on(t.outcomeId)
    .where(sql`${t.outcomeId} IS NOT NULL`)
]);

// ==============================
// role: viewer
// ==============================

export const drafts = table('viewer_draft', {
  categoryId: references(categories.id),
  viewerId: references(viewers.id),
  playerId: references(players.id)
})(t => [pg.index().on(t.viewerId, t.categoryId), pg.index().on(t.categoryId)]);

export const picks = table('viewer_draft_pick', {
  draftId: references(drafts.id),
  pickable: pg.text().notNull()
})(t => [pg.unique().on(t.draftId, t.pickable), pg.index().on(t.pickable)]);

export const observers = table('viewer_events_observer', {
  viewerId: references(viewers.id),
  eventId: references(events.id)
})(t => [pg.unique().on(t.viewerId, t.eventId), pg.index().on(t.eventId)]);

export const pickems = table('viewer_pickaroo_pick', {
  categoryId: references(categories.id),
  playerId: references(players.id),
  viewerId: references(viewers.id),
  pickarooId: references(pickaroos.id),
  pickable: pg.text().notNull()
})(t => [pg.unique().on(t.viewerId, t.pickarooId), pg.index().on(t.viewerId), pg.index().on(t.pickarooId)]);
