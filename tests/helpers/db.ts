// tests/shared/helpers/db.ts
import {
  banned,
  categories,
  drafts,
  events,
  games,
  identities,
  observers,
  picks,
  players,
  users,
  viewers
} from '$lib/server/db/.sql/tables';
import { db } from '../setup';
import { type DB } from '@';

// ============================================================
// CLEANUP
// ============================================================

export const cleanTestDb = async () => {
  console.log('🧹 Cleaning existing data...');
  // Delete in reverse dependency order
  await db.delete(observers);
  await db.delete(picks);
  await db.delete(drafts);
  await db.delete(events);
  await db.delete(banned);
  await db.delete(players);
  await db.delete(viewers);
  await db.delete(identities);
  await db.delete(users);
  await db.delete(categories);
  await db.delete(games);
  console.log('  ✓ Database cleaned');
};

// ============================================================
// USERS
// ============================================================

export const insertUsers = async (count: number) =>
  db
    .insert(users)
    .values(Array.from({ length: count }, () => ({})))
    .returning();

export const insertUser = async () => {
  const [user] = await insertUsers(1);
  return user;
};

// ============================================================
// GAMES & CATEGORIES
// ============================================================

export type GameInsert = { name: string; code: string; description: string };
export type CategoryInsert = { gameId: number; mode: string };

export const insertGame = async (game: GameInsert) => {
  const [inserted] = await db
    .insert(games)
    .values({ ...game, code: game.code, meta: null })
    .returning();
  return inserted;
};

export const insertCategory = async (category: CategoryInsert) => {
  const [inserted] = await db
    .insert(categories)
    .values({ ...category, meta: null })
    .returning();
  return inserted;
};

export const insertCategories = async (categoryList: CategoryInsert[]) =>
  db
    .insert(categories)
    .values(categoryList.map(c => ({ ...c, meta: null })))
    .returning();

// ============================================================
// VIEWERS & PLAYERS
// ============================================================

export type ViewerInsert = DB.Infertable<'Insert'>['viewers'];
export type PlayerInsert = DB.Infertable<'Insert'>['players'];

export const insertIdentioty = async (values: DB.Infertable<'Insert'>['identities']) => {
  const [inserted] = await db.insert(identities).values(values).returning();
  return inserted;
};

export const insertViewer = async (viewer: ViewerInsert) => {
  const [inserted] = await db.insert(viewers).values(viewer).returning();
  return inserted;
};

export const insertViewers = async (viewerList: ViewerInsert[]) => db.insert(viewers).values(viewerList).returning();

export const insertPlayer = async (p: PlayerInsert) => {
  const [inserted] = await db.insert(players).values(p).returning();
  return inserted;
};

export const insertPlayers = async (playerList: PlayerInsert[]) => db.insert(players).values(playerList).returning();

// ============================================================
// EVENTS
// ============================================================

export type EventInsert = DB.Infertable<'Insert'>['events'];

export const insertEvents = async (eventList: EventInsert[]) => db.insert(events).values(eventList).returning();

// ============================================================
// DRAFTS & PICKS
// ============================================================

export type DraftInsert = DB.Infertable<'Insert'>['drafts'];
export type PickInsert = DB.Infertable<'Insert'>['picks'];

export const insertDrafts = async (draftList: Omit<DraftInsert, 'meta'>[]) =>
  db
    .insert(drafts)
    .values(draftList.map(d => ({ ...d, meta: null })))
    .returning();

export const insertPicks = async (pickList: Omit<PickInsert, 'meta'>[]) =>
  db
    .insert(picks)
    .values(pickList.map(p => ({ ...p, meta: null })))
    .returning();

// ============================================================
// OBSERVERS
// ============================================================

export type ObserverInsert = DB.Infertable<'Insert'>['observers'];

export const insertObservers = async (observerList: Omit<ObserverInsert, 'meta'>[]) =>
  db
    .insert(observers)
    .values(observerList.map(o => ({ ...o, meta: null })))
    .returning();

export const insertObserversBatched = async (observerList: Omit<ObserverInsert, 'meta'>[], batchSize = 20000) => {
  const results: DB.Infertable['observers'][] = [];
  for (let i = 0; i < observerList.length; i += batchSize) {
    const batch = observerList.slice(i, i + batchSize);
    const inserted = await insertObservers(batch);
    results.push(...inserted);
  }
  return results;
};
