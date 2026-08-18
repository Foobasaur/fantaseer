/**
 * Exercises `src/lib/server/db/queries/summary.ts` against a real schema — the only test that actually calls
 * `fantasy()` and `scores()`, so it is what covers the SQL those queries emit (the correlated EXISTS clauses,
 * the `EmptyFilter` player scope, and the narrowed `columns`).
 *
 * Inert unless DATABASE_URL points at loopback. `$lib/server/db/client` resolves its connection from
 * VITE_TARGET + DATABASE_URL and otherwise reaches for the SST Resource, so both modules are imported
 * dynamically inside `beforeAll` rather than at collection time — a plain `vitest run` can never touch a
 * database through this file.
 *
 *   VITE_TARGET=mock DATABASE_URL=postgres://root:mysecretpassword@localhost:5433/local npx vitest run tests/live/summary
 *
 * The fixture is its own island: one game (code SUMFIX) and identities tagged `summary-fixture`. Both are
 * deleted before and after the run, and their cascades take the categories, players, viewers, drafts, picks,
 * events, observers, pickaroos and pickems with them — nothing else in the database is read or written.
 */
import * as tables from '$lib/server/db/.sql/tables';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, assert, beforeAll, describe, it } from 'vitest';

type Client = typeof import('$lib/server/db/client');
type Summary = typeof import('$lib/server/db/queries/summary');

const armed = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '');

const TAG = 'summary-fixture';
const CODE = 'SUMFIX';

/** A drafts, then the event lands, then B drafts — so the same event is in reach of A's pick and not B's. */
const DRAFTED_EARLY = new Date('2020-01-01T00:00:00Z');
const EVENT_HAPPENED = new Date('2020-01-01T01:00:00Z');
const DRAFTED_LATE = new Date('2020-01-01T02:00:00Z');

const matrix = {
  ew: {
    observed: { weight: 3, label: 'Observed', description: 'matched events the viewer was watching for' },
    matched: { weight: 1, label: 'Matched', description: 'events a pick reached' }
  },
  pw: {
    win: { weight: 10, label: 'Win', description: 'settled pickem the viewer called' },
    lose: { weight: 1, label: 'Lose', description: 'settled pickem the viewer missed' }
  }
};

describe.skipIf(!armed)('summary queries', () => {
  let db: Client['db'];
  let summary: Summary;

  let category: typeof tables.categories.$inferSelect;
  let quiet: typeof tables.categories.$inferSelect;
  let viewerA = 0;
  let viewerB = 0;
  let viewerC = 0;

  /**
   * Drops the fixture, resolving every id from the tag and the game code so it also clears what a crashed run
   * left behind. Deletes each table by hand rather than leaning on cascades: the local database carries only
   * two of the foreign keys `tables.ts` declares, so deleting a parent row silently orphans its children.
   */
  const purge = async () => {
    const identities = await db
      .select({ id: tables.identities.id, userId: tables.identities.userId })
      .from(tables.identities)
      .where(eq(tables.identities.platform, TAG));
    const games = await db.select({ id: tables.games.id }).from(tables.games).where(eq(tables.games.code, CODE));
    if (!identities.length && !games.length) return;

    const identityIds = identities.map(i => i.id);
    const gameIds = games.map(g => g.id);
    const categoryIds = gameIds.length
      ? (
          await db
            .select({ id: tables.categories.id })
            .from(tables.categories)
            .where(inArray(tables.categories.gameId, gameIds))
        ).map(c => c.id)
      : [];

    if (categoryIds.length) {
      const eventIds = (
        await db.select({ id: tables.events.id }).from(tables.events).where(inArray(tables.events.categoryId, categoryIds))
      ).map(e => e.id);
      const draftIds = (
        await db.select({ id: tables.drafts.id }).from(tables.drafts).where(inArray(tables.drafts.categoryId, categoryIds))
      ).map(d => d.id);

      if (eventIds.length) await db.delete(tables.observers).where(inArray(tables.observers.eventId, eventIds));
      if (draftIds.length) await db.delete(tables.picks).where(inArray(tables.picks.draftId, draftIds));
      await db.delete(tables.drafts).where(inArray(tables.drafts.categoryId, categoryIds));
      await db.delete(tables.pickems).where(inArray(tables.pickems.categoryId, categoryIds));
      await db.delete(tables.pickaroos).where(inArray(tables.pickaroos.categoryId, categoryIds));
      await db.delete(tables.events).where(inArray(tables.events.categoryId, categoryIds));
      await db.delete(tables.categories).where(inArray(tables.categories.gameId, gameIds));
    }
    if (gameIds.length) await db.delete(tables.games).where(inArray(tables.games.id, gameIds));
    if (identityIds.length) {
      await db.delete(tables.viewers).where(inArray(tables.viewers.identityId, identityIds));
      await db.delete(tables.players).where(inArray(tables.players.identityId, identityIds));
      await db.delete(tables.identities).where(inArray(tables.identities.id, identityIds));
      await db.delete(tables.users).where(
        inArray(
          tables.users.id,
          identities.map(i => i.userId)
        )
      );
    }
  };

  beforeAll(async () => {
    ({ db } = await import('$lib/server/db/client'));
    summary = await import('$lib/server/db/queries/summary');
    await purge();

    const [user] = await db.insert(tables.users).values({}).returning();
    const identify = async (platformId: string) => {
      const [row] = await db
        .insert(tables.identities)
        .values({ userId: user.id, platform: TAG, platformId })
        .returning();
      return row.id;
    };

    const [player] = await db
      .insert(tables.players)
      .values({ identityId: await identify('player') })
      .returning();
    const [a] = await db
      .insert(tables.viewers)
      .values({ identityId: await identify('viewer-a') })
      .returning();
    const [b] = await db
      .insert(tables.viewers)
      .values({ identityId: await identify('viewer-b') })
      .returning();
    const [c] = await db
      .insert(tables.viewers)
      .values({ identityId: await identify('viewer-c') })
      .returning();
    [viewerA, viewerB, viewerC] = [a.id, b.id, c.id];

    const [game] = await db.insert(tables.games).values({ name: 'Summary Fixture', code: CODE }).returning();
    [category] = await db.insert(tables.categories).values({ gameId: game.id, mode: 'fixture' }).returning();
    // A category of the same game that nothing ever happens in — the empty-database case, scoped to the fixture.
    [quiet] = await db.insert(tables.categories).values({ gameId: game.id, mode: 'fixture-quiet' }).returning();

    // One event both viewers picked, one nobody picked — the second must never come back from the query at all.
    const [landed] = await db
      .insert(tables.events)
      .values({
        categoryId: category.id,
        playerId: player.id,
        eventable: 'goal',
        pickable: 'alpha',
        createdAt: EVENT_HAPPENED
      })
      .returning();
    await db.insert(tables.events).values({
      categoryId: category.id,
      playerId: player.id,
      eventable: 'goal',
      pickable: 'unpicked',
      createdAt: EVENT_HAPPENED
    });

    const [draftA] = await db
      .insert(tables.drafts)
      .values({ categoryId: category.id, viewerId: a.id, playerId: player.id })
      .returning();
    const [draftB] = await db
      .insert(tables.drafts)
      .values({ categoryId: category.id, viewerId: b.id, playerId: player.id })
      .returning();
    await db.insert(tables.picks).values({ draftId: draftA.id, pickable: 'alpha', createdAt: DRAFTED_EARLY });
    await db.insert(tables.picks).values({ draftId: draftB.id, pickable: 'alpha', createdAt: DRAFTED_LATE });

    // C observed the event but has never drafted anything, so the observers filter should drop the row.
    await db.insert(tables.observers).values([
      { viewerId: a.id, eventId: landed.id },
      { viewerId: c.id, eventId: landed.id }
    ]);

    const [settled] = await db
      .insert(tables.pickaroos)
      .values({
        categoryId: category.id,
        playerId: player.id,
        eventable: 'goal',
        pickables: ['alpha', 'beta'],
        outcomeId: landed.id
      })
      .returning();
    const [open] = await db
      .insert(tables.pickaroos)
      .values({ categoryId: category.id, playerId: player.id, eventable: 'assist', pickables: ['alpha', 'beta'] })
      .returning();
    await db.insert(tables.pickems).values([
      { categoryId: category.id, playerId: player.id, viewerId: a.id, pickarooId: settled.id, pickable: 'alpha' },
      { categoryId: category.id, playerId: player.id, viewerId: b.id, pickarooId: settled.id, pickable: 'beta' },
      { categoryId: category.id, playerId: player.id, viewerId: a.id, pickarooId: open.id, pickable: 'alpha' }
    ]);
  });

  afterAll(async () => {
    if (db) await purge();
  });

  it('gives an event only to the picks that predate it', async () => {
    const rows = await summary.fantasy([category.id]);
    assert.equal(rows.length, 2, 'both drafts come back');
    assert.deepEqual(
      rows.find(r => r.viewerId === viewerA)?.picks.map(p => p.events.length),
      [1],
      'A picked before the event'
    );
    assert.deepEqual(
      rows.find(r => r.viewerId === viewerB)?.picks.map(p => p.events.length),
      [0],
      'B picked after it'
    );
  });

  it('never fetches an event no pick can match', async () => {
    const rows = await summary.fantasy([category.id]);
    const pickables = rows.flatMap(r => r.picks.flatMap(p => p.events.map(e => e.pickable)));
    assert.deepEqual([...new Set(pickables)], ['alpha'], 'the unpicked event is filtered in SQL');
  });

  it('drops observer rows for viewers who never drafted', async () => {
    const rows = await summary.fantasy([category.id]);
    const [event] = rows.flatMap(r => r.picks.flatMap(p => p.events));
    assert.deepEqual(event.observers.map(o => o.viewerId), [viewerA], 'C observed it but has no draft');
  });

  it('leaves unsettled pickaroos out of the scoring entirely', async () => {
    const rows = await summary.pickems([category.id]);
    assert.equal(rows.length, 2, 'the open pickaroo contributes no rows');
  });

  it('scores engagement and settled pickems per viewer and category', async () => {
    const result = await summary.scores([category], matrix);
    const a = result.summaries.viewer.find(v => v.viewer.id === viewerA);
    const b = result.summaries.viewer.find(v => v.viewer.id === viewerB);

    assert.deepEqual({ ...a?.fantasy.engagement }, { matched: 1, observed: 1 });
    assert.deepEqual({ ...b?.fantasy.engagement }, { matched: 0, observed: 0 });
    assert.deepEqual({ ...a?.pickems }, { attempts: 1, hits: 1, misses: 0 }, 'A had one settled pickem, not two');
    assert.deepEqual({ ...b?.pickems }, { attempts: 1, hits: 0, misses: 1 });

    assert.equal(a?.score.engagement, 4, '1 observed × 3 + 1 matched × 1');
    assert.equal(a?.score.pickems, 10, '1 hit × 10');
    assert.equal(a?.fantasy.drafts, 1);
    assert.equal(a?.fantasy.picks, 1);
    assert.deepEqual(a?.fantasy.eventables, [{ eventable: 'goal', pickable: 'alpha', events: 1 }]);

    assert.isUndefined(result.summaries.viewer.find(v => v.viewer.id === viewerC), 'C neither drafted nor picked');
    assert.equal(result.totals.length, 2, 'one bucket for the category, one for the null overall');
  });

  it('gives every requested category a bucket, in the order asked for', async () => {
    const result = await summary.scores([category, quiet], matrix);
    assert.deepEqual(
      result.totals.map(t => t.category?.mode ?? null),
      ['fixture', 'fixture-quiet', null],
      'the quiet category is still a total, then the overall'
    );

    const empty = result.totals.find(t => t.category?.id === quiet.id);
    assert.deepEqual({ ...empty?.fantasy.engagement }, { matched: 0, observed: 0 });
    assert.deepEqual({ ...empty?.pickems }, { attempts: 0, hits: 0, misses: 0 });
    assert.deepEqual(empty?.scores, [], 'nobody ranks in a category nobody played');
  });

  it('still answers with a bucket per category when nothing has happened at all', async () => {
    const result = await summary.scores([quiet], matrix);
    assert.deepEqual(result.totals.map(t => t.category?.mode ?? null), ['fixture-quiet', null]);
    assert.deepEqual(result.summaries.viewer, [], 'no viewer rows to report');
    assert.isTrue(
      result.totals.every(t => t.scores.length === 0),
      'an empty database answers with the shape, not with nothing'
    );
  });
});
