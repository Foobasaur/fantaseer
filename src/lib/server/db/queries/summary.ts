import { db } from '$lib/server/db/client';
import { $get } from '$lib/server/db/kit';
import { AMap } from '$lib/utilz/AMap';
import { sumScalars } from '$lib/utilz/morph';
import { truncate } from '$lib/utilz/stringz';
import type { Game, Server } from '@';

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
  const events = await db.query.events.findMany({
    where: {
      playerId: { in: [...new Set(drafts.map(d => d.playerId))] },
      categoryId: { in: [...new Set(drafts.map(d => d.categoryId))] }
    },
    columns: { id: true, playerId: true, categoryId: true, eventable: true, pickable: true, createdAt: true },
    with: {
      observers: {
        where: { viewerId: { in: [...new Set(drafts.map(d => d.viewerId))] } },
        columns: { viewerId: true }
      }
    }
  });

  // ── Step 3: index events for pick-side match
  const byPickable = new AMap<string, typeof events>();
  for (const e of events) byPickable.compute(`${e.playerId}:${e.categoryId}:${e.pickable}`, () => []).push(e);

  // ── Step 4: bucket
  type Drafts = ((typeof drafts)[number] & {
    picks: ((typeof drafts)[number]['picks'][number] & { events: typeof events })[];
  })[];
  const buckets = AMap.New<`${number}:${number}`>()(() => ({ events: [] as typeof events, drafts: [] as Drafts }));
  const attachedEvents = AMap.New<`${number}:${number}`>()(() => new Set<number>());

  // 4a: attach matched events to picks, push into bucket.drafts
  for (const draft of drafts) {
    const key: `${number}:${number}` = `${draft.viewerId}:${draft.categoryId}`;
    const bucket = buckets.compute(key);
    const attached = attachedEvents.compute(key);

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
export const scores = async (categories: Server.DB.Infertable['categories'][], matrix: Game.Scores, playerId?: number) => {
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
  const summaries = new AMap((k: `${number}:${number}`) => {
    const [viewerId, categoryId] = k.split(':').map(Number);
    const viewer = viewerRows.get(viewerId);
    return {
      viewerId,
      categoryId,
      username: truncate(viewer?.meta?.username || `Viewer ${viewerId}`), // TODD: 0.0.2 delete
      avatar: viewer?.meta?.avatar,
      ...blank()
    };
  });

  for (const draft of fantasyRows.flatMap(f => f.drafts)) {
    const { fantasy } = summaries.compute(`${draft.viewerId}:${draft.categoryId}`);
    fantasy.drafts += 1;
    fantasy.picks += draft.picks.length;

    const matched = new Set<number>();
    for (const pick of draft.picks) {
      fantasy.engagement.matched += pick.events.length;
      fantasy.engagement.observed += pick.events.filter(e => e.observers.some(o => o.viewerId === draft.viewerId)).length;
      for (const event of pick.events) {
        if (matched.has(event.id)) continue;
        else {
          matched.add(event.id);
          (e =>
            (e && (e.events += 1)) ||
            fantasy.eventables.push({ eventable: event.eventable, pickable: pick.pickable, events: 1 }))(
            fantasy.eventables.find(x => x.eventable === event.eventable && x.pickable === pick.pickable)
          );
        }
      }
    }
  }

  for (const pickem of pickemRows.flatMap(p => p.pickems.map(i => ({ ...i, event: p.event?.pickable })))) {
    const { pickems } = summaries.compute(`${pickem.viewerId}:${pickem.categoryId}`);
    pickems[pickem.event === pickem.pickable ? 'hits' : 'misses'] += 1;
    pickems.attempts += 1; // TDDO: revisit before 0.0.2 release
  }

  const buckets = AMap.New<number | null>()(() => ({ ...blank(), rows: new AMap<number, (typeof scoring)[number]>() }));
  const scoring = [...summaries.values()].map(b => {
    const engagement = Math.round(
      b.fantasy.engagement.observed * matrix.ew.observed.weight + b.fantasy.engagement.matched * matrix.ew.matched.weight
    );

    const pickems = Math.round(b.pickems.hits * matrix.pw.win.weight + b.pickems.misses / matrix.pw.lose.weight);

    const score = { ...b, score: { engagement, pickems, weighted: engagement + pickems } };
    const sums = { fantasy: score.fantasy, pickems: score.pickems, score: score.score };
    for (const cid of [score.categoryId, null] as const) {
      const bucket = buckets.compute(cid);
      sumScalars(bucket, sums);

      const viewer = bucket.rows.compute(score.viewerId, () => ({ ...score, ...blank() }));
      sumScalars(viewer, sums);
    }
    return score;
  });

  return {
    totals: [...buckets]
      .filter(([, bucket]) => bucket.rows.size)
      .map(([categoryId, bucket]) => {
        return {
          category: categories.find(c => c.id === categoryId),
          fantasy: bucket.fantasy,
          pickems: bucket.pickems,
          scores: [...bucket.rows.values()]
            .sort((a, b) => b.score.weighted - a.score.weighted)
            .map((row, i) => ({ ...row, rank: i + 1 }))
        };
      }),
    // =================================================
    // TDDO: remove 0.0.2 release
    summaries: {
      viewer: scoring,
      catigory: [...buckets].flatMap(([categoryId]) => (categoryId == null ? [] : [{ categoryId }]))
    }
    // =================================================
  };
};
