// tests/setup.ts
import * as tables from '$lib/server/db/.sql/tables';
import { defineRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll } from 'vitest';
import { cleanTestDb } from './helpers/db';

export const db = drizzle('postgres://root:mysecretpassword@localhost:5433/local', {
  relations: defineRelations({ ...tables }, r => ({
    games: {
      category: r.many.categories()
    },
    categories: {
      game: r.one.games({ from: r.categories.gameId, to: r.games.id }),
      drafts: r.many.drafts(),
      events: r.many.events(),
    },
    users: {
      identities: r.many.identities()
    },
    identities: {
      user: r.one.users({ from: r.identities.userId, to: r.users.id }),
      players: r.many.players(),
      viewers: r.many.viewers()
    },
    players: {
      identity: r.one.identities({ from: r.players.identityId, to: r.identities.id }),
      events: r.many.events()
    },
    viewers: {
      identity: r.one.identities({ from: r.viewers.identityId, to: r.identities.id }),
      drafts: r.many.drafts(),
      observers: r.many.observers()
    },
    events: {
      category: r.one.categories({ from: r.events.categoryId, to: r.categories.id }),
      player: r.one.players({ from: r.events.playerId, to: r.players.id }),
      observers: r.many.observers()
    },
    drafts: {
      category: r.one.categories({ from: r.drafts.categoryId, to: r.categories.id }),
      viewer: r.one.viewers({ from: r.drafts.viewerId, to: r.viewers.id }),
      picks: r.many.picks()
    },
    picks: {
      draft: r.one.drafts({ from: r.picks.draftId, to: r.drafts.id })
    },
    observers: {
      viewer: r.one.viewers({ from: r.observers.viewerId, to: r.viewers.id }),
      event: r.one.events({ from: r.observers.eventId, to: r.events.id })
    }
  }))
});

// ============================================================
// TEST LIFECYCLE HOOKS
// ============================================================

// let SKIP = '0';
// const SKIP_SETUP = SKIP;
// const SKIP_CLEANUP = SKIP;
let SKIP_SETUP = import.meta.env.SKIP_SETUP || '1';
let SKIP_CLEANUP = import.meta.env.SKIP_CLEANUP || '1';
/**
 * Setup test database - cleans existing data
 * Call in `before()` hook or use exported global hooks
 */
export const setupTestDb = async () => {
  if (SKIP_SETUP === '1') {
    console.log('⏭️ Skipping test setup (SKIP_SETUP=1)');
    return;
  }
  console.log('🧪 Setting up test database...');
  try {
    await cleanTestDb();
    console.log('  ✓ Test database ready');
  } catch (error) {
    console.error('  ✗ Failed to setup test database:', error);
    throw error;
  }
};

/**
 * Teardown test database - cleans up after tests
 * Call in `after()` hook or use exported global hooks
 * Set SKIP_CLEANUP=1 env var to preserve data for debugging
 */
export const teardownTestDb = async () => {
  if (SKIP_CLEANUP === '1') {
    console.log('⏭️ Skipping test cleanup (SKIP_CLEANUP=1)');
    return;
  }
  console.log('🧹 Tearing down test database...');
  try {
    await cleanTestDb();
    console.log('  ✓ Test database cleaned');
  } catch (error) {
    console.error('  ✗ Failed to teardown test database:', error);
    // Don't throw on cleanup - tests already passed/failed
  }
};

// ============================================================
// GLOBAL HOOKS (auto-registered when this file is imported)
// ============================================================

beforeAll(async () => {
  console.log('🧪 Global test setup');
  await setupTestDb();
});

afterAll(async () => {
  console.log('✅ Global test teardown');
  await teardownTestDb();
});
