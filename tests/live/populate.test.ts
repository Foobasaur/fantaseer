/**
 * Runner for the DB populator. Deliberately inert unless it is told which database it is aiming at:
 *
 *   live:   terminal 1:  bash .scripts/rds.sh <stage>
 *           terminal 2:  DATABASE_URL="<printed>" LIVE_SEED=1 npm run db:populate
 *
 *   local:  npm run db:populate:local            # SEED_LOCAL=1, loopback DATABASE_URL only
 *
 * Without either every case skips, so a plain `vitest run` can never touch a database — with one deliberate
 * exception: a shell that already exports VITE_TARGET=mock is a shell aimed at the dev database, and local mode
 * arms itself there. This never imports tests/setup.ts or tests/helpers/* — those point at localhost:5433 and
 * their global hooks can truncate tables.
 *
 * Local mode builds the floor a live DB already has (ensureFoundation) and then runs the identical plan/write
 * path, so every assertion below covers both. After writing, it reads the rows back and checks the two claims
 * that matter: the picks really do match real events under summary.fantasy's rule, and the pickems really do
 * resolve to the planned hits and misses.
 */
import { drafts, events, identities, observers, pickaroos, pickems, picks, players } from '$lib/server/db/.sql/tables';
import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { afterAll, assert, beforeAll, describe, it } from 'vitest';
import {
  connect,
  countSeeded,
  describeForecast,
  describeFoundation,
  describeLive,
  describeMock,
  describePlan,
  ensureFoundation,
  environ,
  isArmed,
  isLocal,
  LOCAL_MODES,
  planSeed,
  purgeSeed,
  readConfig,
  readLive,
  writeSeed,
  type Config,
  type Db,
  type Foundation,
  type Live,
  type Plan,
  type Written
} from './populate';

const armed = isArmed();
// Collection-time reads only — readConfig() throws when unarmed, so it stays inside beforeAll.
const dry = process.env.SEED_DRY === '1';
const purgeOnly = process.env.SEED_PURGE === 'only';

const count = async (db: Db, table: PgTable, where?: SQL) => {
  const [row] = await db.select({ total: sql<number>`COUNT(*)::int` }).from(table).where(where);
  return row?.total ?? 0;
};

/** Events the populator did not write — the rows that must come through a run bit-for-bit unchanged. */
const foreign = (tag: string) => sql`${events.meta}->>'seed' IS DISTINCT FROM ${tag}`;

if (!armed)
  console.warn(
    '⏭️  tests/live/populate — skipped.\n' +
      '    live:  open the tunnel with `bash .scripts/rds.sh <stage>`, then re-run with\n' +
      '           DATABASE_URL="<the printed url>" LIVE_SEED=1\n' +
      '    local: npm run db:populate:local'
  );

describe.skipIf(!armed)('populate', () => {
  let cfg: Config;
  let db: Db;
  let live: Live;
  let plan: Plan;
  let foundation: Foundation | undefined;
  let written: Written | undefined;
  let before = { events: 0, players: 0, seeded: 0 };

  beforeAll(async () => {
    cfg = readConfig(await environ());
    db = connect(cfg.url);

    if (cfg.purge !== 'no') {
      // A dry run writes nothing, and deleting is writing.
      if (cfg.dry) console.log(`🧪 dry run — skipping the requested purge of tag "${cfg.tag}"`);
      else console.log(`🧹 purged tag "${cfg.tag}":`, await purgeSeed(db, cfg));
      if (cfg.purge === 'only') return;
    }

    const existing = await countSeeded(db, cfg);
    if (existing && !cfg.dry)
      throw new Error(
        `${existing} identities already carry the tag "${cfg.tag}". Re-run with SEED_PURGE=1 to replace them, ` +
          'or pick a fresh SEED_TAG.'
      );

    // Local only, and before readLive: on a fresh dev DB there is no game, no broadcaster and no history to read.
    if (cfg.local) {
      foundation = await ensureFoundation(db, cfg);
      console.log(describeFoundation(foundation, cfg));
    }

    live = await readLive(db, cfg);
    plan = planSeed(live, cfg);
    before = {
      events: await count(db, events, foreign(cfg.tag)),
      players: await count(db, players),
      // Measured after the foundation, so the delta below is exactly what writeSeed adds.
      seeded: await count(db, events, sql`${events.meta}->>'seed' = ${cfg.tag}`)
    };

    console.log(describeLive(live, cfg));
    console.log(describePlan(plan, cfg));
  }, 300_000);

  afterAll(async () => {
    if (plan?.forecast.length) console.log(describeForecast(plan));
    if (written) {
      if (cfg.local) console.log(`\n${describeMock(plan, written, cfg)}`);
      console.log(
        cfg.local ?
          `\n♻️  to take it back out: SEED_TAG=${cfg.tag} npm run db:populate:local:purge\n`
        : `\n♻️  to take it back out: DATABASE_URL="…" LIVE_SEED=1 SEED_TAG=${cfg.tag} npm run db:populate:purge\n`
      );
    }
    await db?.$client.end();
  });

  it.skipIf(purgeOnly)('finds player activity to build on', () => {
    assert.ok(live.pairs.length > 0, 'no player+category pairs with events');
    for (const pair of live.pairs) assert.ok(pair.events.length > 0, `pair ${pair.key} has no events`);
  });

  // The dev fallback in src/lib/server/auth.ts resolves the broadcaster by this exact channel_id, and the UI
  // drops any pickable module.fromPickable cannot hydrate — so a local seed the app cannot read is a failed one.
  it.skipIf(!isLocal() || purgeOnly)('wires the local floor to what the dev server actually resolves', async () => {
    assert.ok(foundation, 'local mode ran without building a foundation');
    assert.deepEqual(
      foundation.categories.map(c => c.mode).sort(),
      [...LOCAL_MODES].sort(),
      'the local game is missing modes'
    );

    const [row] = await db
      .select({ platformId: identities.platformId })
      .from(players)
      .innerJoin(identities, eq(identities.id, players.identityId))
      .where(eq(players.id, foundation.playerId));
    assert.strictEqual(row?.platformId, cfg.channelId, 'the broadcaster is not the channel the dev fallback asks for');

    const { default: CDN } = await import('$lib/core/games/HS/common/cdn');
    const known = new Set((await CDN()).cards.map(c => c.id));
    const pickables = await db
      .selectDistinct({ pickable: events.pickable })
      .from(events)
      .where(eq(events.playerId, foundation.playerId));
    const orphans = pickables.filter(p => !known.has(p.pickable));
    assert.deepEqual(orphans, [], 'seeded pickables the game module cannot hydrate into cards');
  }, 300_000);

  it.skipIf(purgeOnly)('mints funky, unique handles', () => {
    assert.strictEqual(plan.viewers.length, cfg.viewers);
    assert.strictEqual(new Set(plan.viewers.map(v => v.username)).size, cfg.viewers, 'duplicate usernames');
    assert.strictEqual(new Set(plan.viewers.map(v => v.platformId)).size, cfg.viewers, 'duplicate platformIds');
  });

  it.skipIf(purgeOnly)('plans drafts whose picks already score', () => {
    const scoring = plan.drafts.reduce((sum, d) => sum + d.picks.filter(p => p.matches.length).length, 0);
    assert.ok(plan.drafts.length > 0, 'no drafts planned');
    assert.ok(scoring > 0, 'no planned pick matches an existing event — nothing would be scored');
    // picks is unique on (draftId, pickable), so a repeat inside one draft would fail the insert.
    for (const draft of plan.drafts)
      assert.strictEqual(new Set(draft.picks.map(p => p.pickable)).size, draft.picks.length, 'duplicate pick in draft');
  });

  it.skipIf(purgeOnly)('plans resolved pickaroos with real outcomes', () => {
    const resolved = plan.pickaroos.filter(p => p.outcomeId != null);
    assert.ok(resolved.length > 0, 'no resolved pickaroos planned');
    for (const pickaroo of resolved)
      assert.ok(pickaroo.pickables.includes(pickaroo.winner!), 'winning pickable missing from the offered options');
    assert.ok(plan.pickems.length > 0, 'no pickems planned');
  });

  it.skipIf(dry || purgeOnly)(
    'writes the seed',
    async () => {
      written = await writeSeed(db, plan, cfg);
      console.log('✍️  written:', { ...written, viewerIds: `${written.viewerIds.length} ids` });
      assert.strictEqual(written.viewers, cfg.viewers);
      assert.strictEqual(written.drafts, plan.drafts.length);
    },
    600_000
  );

  it.skipIf(dry || purgeOnly)(
    'leaves the player data it builds on untouched',
    async () => {
      assert.strictEqual(await count(db, events, foreign(cfg.tag)), before.events, 'pre-existing event rows changed');
      assert.strictEqual(await count(db, players), before.players, 'player rows changed');
      // Everything writeSeed adds to player_event is tagged, and there is exactly as much of it as the plan
      // called for. On local the foundation's own events carry the same tag, so this is a delta, not a total.
      const tagged = await count(db, events, sql`${events.meta}->>'seed' = ${cfg.tag}`);
      assert.strictEqual(tagged - before.seeded, plan.events.length, 'seeded event count does not match the plan');
    },
    120_000
  );

  it.skipIf(dry || purgeOnly)(
    'lands scorers in every mode it planned for',
    async () => {
      const rows = await db
        .select({ categoryId: drafts.categoryId, drafts: sql<number>`COUNT(*)::int` })
        .from(drafts)
        .where(sql`${drafts.meta}->>'seed' = ${cfg.tag}`)
        .groupBy(drafts.categoryId);

      const sorted = (ids: number[]) => [...new Set(ids)].sort((a, b) => a - b);
      assert.deepEqual(
        sorted(rows.map(r => r.categoryId)),
        sorted(plan.drafts.map(d => d.categoryId)),
        'seeded drafts do not cover every planned category'
      );
    },
    120_000
  );

  it.skipIf(dry || purgeOnly)(
    'lands drafts that are already scored',
    async () => {
      // Same rule summary.fantasy uses: same player + category + pickable, and the event is not older than the pick.
      const [row] = await db
        .select({ scoring: sql<number>`COUNT(DISTINCT ${picks.id})::int` })
        .from(picks)
        .innerJoin(drafts, eq(drafts.id, picks.draftId))
        .innerJoin(
          events,
          and(
            eq(events.categoryId, drafts.categoryId),
            eq(events.playerId, drafts.playerId),
            eq(events.pickable, picks.pickable),
            sql`${events.createdAt} >= ${picks.createdAt}`
          )
        )
        .where(sql`${drafts.meta}->>'seed' = ${cfg.tag}`);

      const expected = plan.drafts.reduce((sum, d) => sum + d.picks.filter(p => p.matches.length).length, 0);
      assert.strictEqual(row.scoring, expected, 'scored picks in the DB do not match the forecast');
    },
    120_000
  );

  it.skipIf(dry || purgeOnly)(
    'lands pickems with the planned hit/miss split',
    async () => {
      const [row] = await db
        .select({
          attempts: sql<number>`COUNT(*)::int`,
          hits: sql<number>`(COUNT(*) FILTER (WHERE ${events.pickable} = ${pickems.pickable}))::int`
        })
        .from(pickems)
        .innerJoin(pickaroos, eq(pickaroos.id, pickems.pickarooId))
        .leftJoin(events, eq(events.id, pickaroos.outcomeId))
        .where(sql`${pickems.meta}->>'seed' = ${cfg.tag}`);

      assert.strictEqual(row.attempts, plan.pickems.length);
      assert.strictEqual(row.hits, plan.pickems.filter(p => p.hit).length, 'pickem hits do not match the forecast');
    },
    120_000
  );

  it.skipIf(dry || purgeOnly)(
    'lands observers against real events',
    async () => {
      const [row] = await db
        .select({ total: sql<number>`COUNT(*)::int` })
        .from(observers)
        .innerJoin(events, eq(events.id, observers.eventId))
        .where(sql`${observers.meta}->>'seed' = ${cfg.tag}`);
      assert.strictEqual(row.total, plan.observers.length);
    },
    120_000
  );
});
