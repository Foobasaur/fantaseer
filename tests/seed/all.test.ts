import { categories, drafts, events, games, observers, picks, players, viewers } from '$lib/server/db/.sql/tables';
import {
  type CategoryEntry,
  type PlayerEntry,
  type ViewerProfileEntry,
  counts,
  createDraftsAndPicks,
  createEvents,
  createGamesAndCategories,
  createObservers,
  createUsersViewersPlayers,
  getAllPickablesFromConfig,
  SEED_CONFIG
} from '../helpers/seed';
import { db } from '../setup';
import type { Server } from '@';
import { assert, beforeAll, describe, it } from 'vitest';

// ============================================================
// STEP-BY-STEP INTEGRATION TESTS
// ============================================================

describe('Full Seed Pipeline', () => {
  let gameId: number;
  let categoryMap: Map<number, CategoryEntry>;
  let viewerProfiles: ViewerProfileEntry[];
  let playerMap: Map<number, PlayerEntry[]>;
  let eventMap: Map<number, Server.DB.Infertable['events'][]>;
  let draftMapping: Map<number, Server.DB.Infertable['drafts'][]>;
  let pickMapping: Map<number, Server.DB.Infertable['picks'][]>;
  let observerMap: Map<number, Server.DB.Infertable['observers'][]>;
  let pickables: Map<string, string[]>;

  beforeAll(async () => {
    pickables = await getAllPickablesFromConfig();

    // Step 1: Games & Categories
    ({ gameId, categoryMap } = await createGamesAndCategories());

    // Step 2: Users, Viewers, Players
    ({ viewerProfiles, playerMap } = await createUsersViewersPlayers(categoryMap));

    // Step 3: Events
    eventMap = await createEvents(categoryMap, playerMap, pickables);

    // Step 4: Drafts & Picks
    ({ draftMapping, pickMapping } = await createDraftsAndPicks(categoryMap, playerMap, viewerProfiles, eventMap, pickables));

    // Step 5: Observers
    observerMap = await createObservers(viewerProfiles, eventMap);
  }, 30000);

  // --- Step 1: Games & Categories ---
  it('creates games from SEED_CONFIG', async () => {
    const gameRows = await db.select().from(games);
    assert.strictEqual(gameRows.length, SEED_CONFIG.games.length);
    assert.strictEqual(gameRows[0].code, 'HS');
    assert.ok(gameId > 0, 'Should return valid gameId');
  });

  it('creates categories for each game mode', async () => {
    const categoryRows = await db.select().from(categories);
    assert.strictEqual(categoryRows.length, SEED_CONFIG.categories.length);
    assert.strictEqual(categoryMap.size, SEED_CONFIG.categories.length);

    const modes = [...categoryMap.values()].map(c => c.mode);
    assert.ok(modes.includes('Arena'));
    assert.ok(modes.includes('Standard'));
    assert.ok(modes.includes('Wild'));
    assert.ok(modes.includes('Battlegrounds'));
  });

  it('categoryMap entries have correct structure', () => {
    for (const [id, entry] of categoryMap) {
      assert.strictEqual(typeof entry.id, 'number');
      assert.strictEqual(typeof entry.gameId, 'number');
      assert.strictEqual(typeof entry.mode, 'string');
      assert.strictEqual(entry.id, id);
    }
  });

  // --- Step 2: Users, Viewers, Players ---
  it('creates viewer users with profiles', async () => {
    const expectedViewerCount = Object.values(counts.profiles).reduce((sum, count) => sum + (count ?? 0), 0);

    assert.strictEqual(viewerProfiles.length, expectedViewerCount);

    const viewerRows = await db.select().from(viewers);
    assert.strictEqual(viewerRows.length, expectedViewerCount);
  });

  it('creates players for each category', async () => {
    for (const [, categoryPlayers] of playerMap) {
      assert.strictEqual(categoryPlayers.length, counts.playersPerCategory);
    }

    const playerRows = await db.select().from(players);
    assert.strictEqual(playerRows.length, counts.playersPerCategory * categoryMap.size);
  });

  it('viewer profiles have correct structure', () => {
    for (const vp of viewerProfiles) {
      assert.strictEqual(typeof vp.viewerId, 'number');
      assert.strictEqual(typeof vp.userId, 'string');
      assert.ok(vp.profile);
      assert.ok(['high', 'medium', 'low', 'inactive', 'bot', 'lucky'].includes(vp.profile.type));
    }
  });

  // --- Step 3: Events ---
  it('creates events for each player in each category', () => {
    const expectedEventsPerCategory = counts.playersPerCategory * counts.events.perPlayer;

    for (const [, evts] of eventMap) {
      assert.strictEqual(evts.length, expectedEventsPerCategory);
    }
  });

  it('events have valid pickables and eventables', async () => {
    const eventRows = await db.select().from(events);
    for (const event of eventRows) {
      assert.ok(event.pickable, 'Event should have pickable');
      assert.ok(event.eventable, 'Event should have eventable');
    }
  });

  // --- Step 4: Drafts & Picks ---
  it('creates drafts for viewers', async () => {
    const draftRows = await db.select().from(drafts);
    assert.ok(draftRows.length > 0, 'Should create drafts');
  });

  it('creates picks for each draft', async () => {
    const pickRows = await db.select().from(picks);
    assert.ok(pickRows.length > 0, 'Should create picks');

    for (const [draftId, draftPicks] of pickMapping) {
      assert.strictEqual(
        draftPicks.length,
        counts.drafts.picksPerDraft,
        `Draft ${draftId} should have ${counts.drafts.picksPerDraft} picks`
      );
    }
  });

  it('inactive viewers create fewer drafts', async () => {
    const draftRows = await db.select().from(drafts);
    const inactiveViewerIds = viewerProfiles.filter(vp => vp.profile.type === 'inactive').map(vp => vp.viewerId);

    const inactiveDrafts = draftRows.filter(d => inactiveViewerIds.includes(d.viewerId));
    const activeViewerCount = viewerProfiles.length - inactiveViewerIds.length;
    const activeDrafts = draftRows.length - inactiveDrafts.length;

    assert.ok(
      activeDrafts / activeViewerCount >= inactiveDrafts.length / Math.max(inactiveViewerIds.length, 1),
      'Active viewers should create more drafts on average'
    );
  });

  // --- Step 5: Observers ---
  it('creates observer relationships', async () => {
    const observerRows = await db.select().from(observers);
    assert.ok(observerRows.length > 0, 'Should create observer relationships');
  });

  it('high-activity viewers observe more events than bots', () => {
    const highViewers = viewerProfiles.filter(vp => vp.profile.type === 'high');
    const botViewers = viewerProfiles.filter(vp => vp.profile.type === 'bot');

    const highObservations = highViewers.reduce((sum, vp) => sum + (observerMap.get(vp.viewerId)?.length ?? 0), 0);
    const botObservations = botViewers.reduce((sum, vp) => sum + (observerMap.get(vp.viewerId)?.length ?? 0), 0);

    const highAvg = highObservations / Math.max(highViewers.length, 1);
    const botAvg = botObservations / Math.max(botViewers.length, 1);

    assert.ok(highAvg > botAvg, `High (${highAvg.toFixed(1)}) > Bot (${botAvg.toFixed(1)})`);
  });
});
