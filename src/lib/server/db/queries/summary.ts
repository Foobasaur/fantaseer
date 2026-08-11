import { db, tablez } from '$lib/server/db/client';
import { lbizaMap } from '$lib/utilz/lbizaMap';
import type { Server, Game } from '@';
import { and, type AnyColumn, eq, inArray, notExists, sql } from 'drizzle-orm';
import { $get } from '../kit';
import { truncate } from '$lib/utilz/stringz';
import { sumScalars } from '$lib/utilz/morph';

// ============================================================
// SQL Fragment Builders
// ============================================================

const sqlCount = (column: AnyColumn) => sql<number>`COUNT(DISTINCT ${column})::int`;
const sqlPlayer = (column: AnyColumn, playerId?: number) => (playerId != null ? eq(column, playerId) : undefined);
const sqlCategories = (column: AnyColumn, categories: Server.DB.Infertable['categories'][]) =>
  inArray(
    column,
    categories.map(c => c.id)
  );
const qwWhere = (
  table: Server.DB.Tables['drafts' | 'pickems'],
  categories: Server.DB.Infertable['categories'][],
  playerId?: number
) =>
  and(
    sqlPlayer(table.playerId, playerId),
    sqlCategories(table.categoryId, categories),
    notExists(
      db
        .select()
        .from(tablez.banned)
        .where(and(eq(tablez.banned.viewerId, table.viewerId), eq(tablez.banned.playerId, table.playerId)))
    )
  );

// ============================================================
// Query Functions
// ============================================================

/** Get aggregated engagement summary across categories */
export const fantasy = async (categories: Server.DB.Infertable['categories'][], playerId?: number) => {
  // ── Step 1: drafts + nested picks via RQB
  const drafts = await db.query.drafts.findMany({
    where: {
      categoryId: { in: categories.map(c => c.id) },
      ...(playerId != null ? { playerId } : {})
    },
    columns: { id: true, viewerId: true, categoryId: true, playerId: true },
    with: {
      picks: { columns: { id: true, pickable: true, createdAt: true } }
    }
  });
  if (!drafts.length) return [];

  // ── Step 2: candidate events for touched (player, category) pairs + observer scope
  const playerIds = [...new Set(drafts.map(d => d.playerId))];
  const categoryIds = [...new Set(drafts.map(d => d.categoryId))];
  const viewerIds = [...new Set(drafts.map(d => d.viewerId))];

  const events = await db.query.events.findMany({
    where: { playerId: { in: playerIds }, categoryId: { in: categoryIds } },
    columns: { id: true, playerId: true, categoryId: true, eventable: true, pickable: true, createdAt: true },
    with: {
      observers: {
        where: { viewerId: { in: viewerIds } },
        columns: { viewerId: true }
      }
    }
  });

  // ── Step 3: index events for pick-side match
  const byPickable = new lbizaMap<string, typeof events>();
  for (const e of events) byPickable.getOrCompute(`${e.playerId}:${e.categoryId}:${e.pickable}`, () => []).push(e);

  // ── Step 4: bucket
  type Events = typeof events;
  type Drafts = ((typeof drafts)[number] & {
    picks: ((typeof drafts)[number]['picks'][number] & { events: Events })[];
  })[];
  const buckets = new lbizaMap<`${number}:${number}`, { events: Events; drafts: Drafts }>();
  const attachedEvents = new lbizaMap<`${number}:${number}`, Set<number>>();

  // 4a: attach matched events to picks, push into bucket.drafts
  for (const draft of drafts) {
    const key: `${number}:${number}` = `${draft.viewerId}:${draft.categoryId}`;
    const bucket = buckets.getOrCompute(key, () => ({ events: [], drafts: [] }));
    const attached = attachedEvents.getOrCompute(key, () => new Set<number>());

    const picks = draft.picks.map(pick => {
      const candidates = byPickable.get(`${draft.playerId}:${draft.categoryId}:${pick.pickable}`) ?? [];
      const evs = candidates.filter(e => e.createdAt >= pick.createdAt);
      for (const e of evs) attached.add(e.id);
      return { ...pick, events: evs };
    });
    bucket.drafts.push({ ...draft, picks });
  }

  // 4b: collect remaining (un-attached) events into each relevant bucket
  for (const e of events) {
    for (const { viewerId } of e.observers) {
      const key: `${number}:${number}` = `${viewerId}:${e.categoryId}`;
      if (attachedEvents.get(key)?.has(e.id)) continue;
      buckets.get(key)?.events.push(e);
    }
  }

  return [...buckets.values()];
};

/** Get aggregated pickems summary across categories */
export const pickems = async (categories: Server.DB.Infertable['categories'][], playerId?: number) => {
  const query = await db.query.pickaroos.findMany({
    where: {
      categoryId: { in: categories.map(c => c.id) },
      ...(playerId != null && { playerId })
    },
    with: { pickems: true, event: true }
  });
  return query;
};

/** Get aggregated per-(viewer, category) raw counts scoped to a player */
export const scores = async (categories: Server.DB.Infertable['categories'][], scoring: Game.Scores, playerId?: number) => {
  const [fantasyRows, pickemRows, viewerRows] = await Promise.all([
    fantasy(categories, playerId),
    pickems(categories, playerId),
    $get('viewers')<Server.DB.Viewer['meta']>().then(rows => new Map(rows.map(row => [row.id, row] as const)))
  ]);

  const blank = () => ({
    fantasy: {
      drafts: 0,
      picks: 0,
      engagement: { matched: 0, observed: 0 },
      eventables: new Array<{ eventable: string; pickable: string; events: number }>()
    },
    pickems: { attempts: 0, hits: 0, misses: 0 },
    score: { engagement: 0, pickems: 0, weighted: 0 }
  });
  const empty = (k: `${number}:${number}`) => {
    const [viewerId, categoryId] = k.split(':').map(Number);
    const viewer = viewerRows.get(viewerId);
    return {
      viewerId,
      categoryId,
      username: truncate(viewer?.meta?.username || `Viewer ${viewerId}`), // TODD: 0.0.2 delete
      avatar: viewer?.meta?.avatar,
      ...blank()
    };
  };
  const seed = () => ({ ...blank(), rows: [] as typeof rows });
  const catbuckets = new lbizaMap<number | null, ReturnType<typeof seed>>();
  const buckets = new lbizaMap<`${number}:${number}`, ReturnType<typeof empty>>();

  for (const { drafts, events } of fantasyRows) {
    const { viewerId, categoryId } = drafts[0] || events[0];
    const { fantasy } = buckets.getOrCompute(`${viewerId}:${categoryId}`, empty);
    if (!drafts.length) continue;

    const matched = new Set<number>();
    const observed = new Set<number>();
    for (const draft of drafts) {
      fantasy.drafts += 1;
      fantasy.picks += draft.picks.length;
      for (const pick of draft.picks) {
        for (const event of pick.events) {
          if (event.observers.some(o => o.viewerId === viewerId)) observed.add(event.id);
          if (matched.has(event.id)) continue;
          else {
            matched.add(event.id);
            const eventable = fantasy.eventables.find(x => x.eventable === event.eventable && x.pickable === pick.pickable);
            if (eventable) eventable.events += 1;
            else fantasy.eventables.push({ eventable: event.eventable, pickable: pick.pickable, events: 1 });
          }
        }
      }
    }
    fantasy.engagement.observed = observed.size;
    fantasy.engagement.matched = matched.size - observed.size;
  }

  for (const pickaroo of pickemRows) {
    for (const pickem of pickaroo.pickems) {
      const { pickems } = buckets.getOrCompute(`${pickem.viewerId}:${pickem.categoryId}`, empty);
      pickems[pickaroo.event?.pickable == pickem.pickable ? 'hits' : 'misses'] += 1;
    }
  }

  const rows = [...buckets.values()].map(b => {
    const attempts = b.pickems.hits + b.pickems.misses;
    const engagement = Math.round(
      b.fantasy.engagement.observed * scoring.ew.observed.weight + b.fantasy.engagement.matched * scoring.ew.matched.weight
    );
    const pickems = Math.round(
      b.pickems.hits * scoring.pw.win.weight + (attempts * b.pickems.misses) / scoring.pw.lose.weight
    );
    return { ...b, pickems: { ...b.pickems, attempts }, score: { engagement, pickems, weighted: engagement + pickems } };
  });

  // ── Step 5: fold rows into per-category totals + a null "all categories" bucket
  for (const row of rows) {
    for (const cid of [row.categoryId, null] as const) {
      const bucket = catbuckets.getOrCompute(cid, seed);
      bucket.rows.push(row);
      sumScalars(bucket, row);
    }
  }

  return {
    totals: [...catbuckets]
      .filter(([, bucket]) => bucket.rows.length)
      .map(([categoryId, bucket]) => {
        const groups = new lbizaMap<number, typeof rows>();
        bucket.rows.forEach(row => groups.getOrCompute(row.viewerId, () => []).push(row));
        return {
          category: categories.find(c => c.id === categoryId),
          fantasy: bucket.fantasy,
          pickems: bucket.pickems,
          scores: [...groups.values()]
            .map(group => {
              const merge = group.reduce((acc, curr) => sumScalars(acc, curr), blank());
              return { ...group[0], ...merge };
            })
            .sort((a, b) => b.score.weighted - a.score.weighted)
            .map((row, i) => ({ ...row, rank: i + 1 }))
        };
      }),
    // =================================================
    // TDDO: remove 0.0.2 release
    summaries: {
      viewer: rows,
      catigory: [...catbuckets].flatMap(([categoryId]) => (categoryId == null ? [] : [{ categoryId }]))
    }
    // =================================================
  };
};
