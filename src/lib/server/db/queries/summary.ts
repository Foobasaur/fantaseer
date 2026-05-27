import { db, tablez } from '$lib/server/db/client';
import { lbizaMap } from '$lib/utilz/lbizaMap';
import type { DB } from '@';
import { and, type AnyColumn, eq, inArray, notExists, sql } from 'drizzle-orm';
import { $get } from '../kit';

// ============================================================
// SQL Fragment Builders
// ============================================================

const sqlCount = (column: AnyColumn) => sql<number>`COUNT(DISTINCT ${column})::int`;
const sqlPlayer = (column: AnyColumn, playerId?: number) => (playerId != null ? eq(column, playerId) : undefined);
const sqlCategories = (column: AnyColumn, categories: DB.Infertable['categories'][]) =>
  inArray(
    column,
    categories.map(c => c.id)
  );
const qwWhere = (table: DB.Tables['drafts' | 'pickems'], categories: DB.Infertable['categories'][], playerId?: number) =>
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
export const fantasy = async (categories: DB.Infertable['categories'][], playerId?: number) => {
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
export const pickems = async (categories: DB.Infertable['categories'][], playerId?: number) => {
  // const rows = await db
  //   .select({
  //     ...getColumns(tablez.pickems),
  //     eventable: tablez.events.eventable,
  //     eventPickable: tablez.events.pickable
  //   })
  //   .from(tablez.pickems)
  //   .innerJoin(tablez.pickaroos, eq(tablez.pickaroos.id, tablez.pickems.pickarooId))
  //   .leftJoin(tablez.events, eq(tablez.events.id, tablez.pickaroos.outcomeId))
  //   .where(qwWhere(tablez.pickems, categories, playerId));

  const query = await db.query.pickaroos.findMany({
    where: {
      categoryId: { in: categories.map(c => c.id) },
      ...(playerId != null ? { playerId } : {})
    },
    with: {
      pickems: true,
      event: true
    }
  });

  // const empty = (k: `${number}:${number}`) => {
  //   const [viewerId, categoryId] = k.split(':').map(Number);
  //   return { viewerId, categoryId, attempts: 0, hits: 0, misses: 0 };
  // };
  // const buckets = new lbizaMap<`${number}:${number}`, ReturnType<typeof empty>>();
  // for (const row of rows) {
  //   const bucket = buckets.getOrCompute(`${row.viewerId}:${row.categoryId}`, empty);
  //   bucket.attempts++;
  //   if (row.eventPickable != null) {
  //     if (row.pickable === row.eventPickable) bucket.hits++;
  //     else bucket.misses++;
  //   }
  // }

  return query;
};

/** Get aggregated per-(viewer, category) raw counts scoped to a player */
export const scores = async (categories: DB.Infertable['categories'][], playerId?: number) => {
  const [fantasyRows, pickemRows, viewerRows] = await Promise.all([
    fantasy(categories, playerId),
    pickems(categories, playerId),
    $get('viewers')<DB.Viewer['meta']>().then(rows => new Map(rows.map(v => [v.id, v] as const)))
  ]);

  const empty = (k: `${number}:${number}`) => {
    const [viewerId, categoryId] = k.split(':').map(Number);
    const viewer = viewerRows.get(viewerId);
    return {
      viewerId,
      categoryId,
      username: viewer?.meta?.username || `Viewer ${viewerId}`,
      avatar: viewer?.meta?.avatar,
      fantasy: {
        drafts: 0,
        picks: 0,
        observedPicks: 0,
        notObservedEvents: 0,
        unpicked: 0,
        eventables: [] as { eventable: string; pickable: string; events: number }[]
      },
      pickems: { attempts: 0, hits: 0, misses: 0 }
    };
  };
  const cidbuckets = new lbizaMap<number, {pickaroo:{open:number}}>();
  const buckets = new lbizaMap<`${number}:${number}`, ReturnType<typeof empty>>();

  for (const { drafts, events } of fantasyRows) {
    const { viewerId, categoryId } = drafts[0] || events[0];
    const { fantasy } = buckets.getOrCompute(`${viewerId}:${categoryId}`, empty);
    fantasy.unpicked += events.length;

    if (!drafts.length) continue;
    const matched = new Set<number>();
    const observed = new Set<number>();

    for (const draft of drafts) {
      fantasy.drafts += 1;
      fantasy.picks += draft.picks.length;
      for (const pick of draft.picks) {
        let pickObserved = false;
        for (const event of pick.events) {
          if (event.observers.some(o => o.viewerId === viewerId)) {
            observed.add(event.id);
            pickObserved = true;
          }
          if (!matched.has(event.id)) {
            matched.add(event.id);
            const e = fantasy.eventables.find(x => x.eventable === event.eventable && x.pickable === pick.pickable);
            if (e) e.events += 1;
            else fantasy.eventables.push({ eventable: event.eventable, pickable: pick.pickable, events: 1 });
          }
        }
        if (pickObserved) fantasy.observedPicks += 1;
      }
    }
    fantasy.notObservedEvents = matched.size - observed.size;
  }
  for (const pickaroo of pickemRows) {
    cidbuckets.getOrSet(pickaroo.categoryId, {pickaroo:{open: 0}}).pickaroo.open += pickaroo.event == null ? 1 : 0;
    for (const pickem of pickaroo.pickems) {
      const { pickems } = buckets.getOrCompute(`${pickem.viewerId}:${pickem.categoryId}`, empty);
      pickems.attempts += 1;
      if (pickaroo.event?.pickable == pickem.pickable) {
        pickems.hits += 1;
      } else {
        pickems.misses += 1;
      }
    }
  }

  return {buckets:  [...buckets.values()], cidbuckets: [...cidbuckets].map(([categoryId, {pickaroo}]) => ({ categoryId, pickaroo })) };
};
