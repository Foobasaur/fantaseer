import { EmptyFilter, and, eq, exists, lte } from 'drizzle-orm';

import { db, tablez } from '$lib/server/db/client';
import { $get } from '$lib/server/db/kit';
import { AMap } from '$lib/common/impl/AMap';
import { sumScalars } from '$lib/utilz/morph';
import { truncate } from '$lib/utilz/stringz';
import type { Game, Server } from '@';

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

/** Get aggregated engagement summary across categories */
export const fantasy = async (categoryIds: number[], playerId: number | EmptyFilter = EmptyFilter) => {
  const [drafts, events] = await Promise.all([
    db.query.drafts.findMany({
      columns: { viewerId: true, categoryId: true, playerId: true },
      where: { categoryId: { in: categoryIds }, playerId },
      with: { picks: { columns: { pickable: true, createdAt: true } } }
    }),
    db.query.events.findMany({
      columns: { playerId: true, categoryId: true, eventable: true, pickable: true, createdAt: true },
      where: {
        categoryId: { in: categoryIds },
        playerId,
        RAW: event =>
          exists(
            db
              .select()
              .from(tablez.picks)
              .innerJoin(tablez.drafts, eq(tablez.drafts.id, tablez.picks.draftId))
              .where(
                and(
                  eq(tablez.drafts.playerId, event.playerId),
                  eq(tablez.drafts.categoryId, event.categoryId),
                  eq(tablez.picks.pickable, event.pickable),
                  lte(tablez.picks.createdAt, event.createdAt)
                )
              )
          )
      },
      with: {
        observers: {
          columns: { viewerId: true },
          where: {
            RAW: observer => exists(db.select().from(tablez.drafts).where(eq(tablez.drafts.viewerId, observer.viewerId)))
          }
        }
      }
    })
  ]);

  return drafts.map(draft => ({
    ...draft,
    picks: draft.picks.map(pick => ({
      ...pick,
      events: events.filter(
        e =>
          e.pickable === pick.pickable &&
          e.playerId === draft.playerId &&
          e.categoryId === draft.categoryId &&
          e.createdAt >= pick.createdAt
      )
    }))
  }));
};

/** Get aggregated pickems summary across categories */
export const pickems = async (categoryIds: number[], playerId: number | EmptyFilter = EmptyFilter) => {
  const query = await db.query.pickaroos.findMany({
    columns: { id: true },
    where: {
      playerId,
      outcomeId: { isNotNull: true },
      categoryId: { in: categoryIds }
    },
    with: {
      pickems: { columns: { viewerId: true, categoryId: true, pickable: true } },
      event: { columns: { pickable: true } }
    }
  });
  return query.flatMap(p => p.pickems.map(i => ({ ...i, event: p.event })));
};

/** Get aggregated per-(viewer, category) raw counts scoped to a player */
export const scores = async (categories: Server.DB.Infertable['categories'][], matrix: Game.Scores, playerId?: number) => {
  const categoryIds = categories.map(c => c.id);
  const [drafts, pickaroos] = await Promise.all([fantasy(categoryIds, playerId), pickems(categoryIds, playerId)]);
  const viewers = (
    await $get('viewers')<Server.DB.Viewer['meta']>({
      where: { id: ['inArray', [...new Set([...drafts, ...pickaroos].map(row => row.viewerId))]] }
    })
  ).map(v => ({ ...v, meta: { avatar: v.meta?.avatar, username: v.meta?.username || `#${v.id}` } }));

  const summaries = new AMap((k: `${number}:${number}`) => {
    const [viewerId, categoryId] = k.split(':').map(Number);
    const viewer = viewers.find(v => v.id === viewerId) || { id: viewerId, meta: { avatar: null, username: `#${viewerId}` } };
    return { ...blank(), categoryId, viewer };
  });

  for (const draft of drafts) {
    const { fantasy } = summaries.compute(`${draft.viewerId}:${draft.categoryId}`);
    fantasy.drafts += 1;
    fantasy.picks += draft.picks.length;

    for (const pick of draft.picks) {
      fantasy.engagement.matched += pick.events.length;
      for (const event of pick.events) {
        if (event.observers.some(o => o.viewerId === draft.viewerId)) fantasy.engagement.observed += 1;
        (e =>
          (e && (e.events += 1)) ||
          fantasy.eventables.push({ eventable: event.eventable, pickable: pick.pickable, events: 1 }))(
          fantasy.eventables.find(x => x.eventable === event.eventable && x.pickable === pick.pickable)
        );
      }
    }
  }

  for (const pickem of pickaroos) {
    const { pickems } = summaries.compute(`${pickem.viewerId}:${pickem.categoryId}`);
    pickems[pickem.event?.pickable === pickem.pickable ? 'hits' : 'misses'] += 1;
    pickems.attempts += 1; // TDDO: revisit before 0.0.2 release
  }

  const scoring = [...summaries.values()].map(b => {
    const pickems = Math.round(b.pickems.hits * matrix.pw.win.weight + b.pickems.misses / matrix.pw.lose.weight);
    const engagement = Math.round(
      b.fantasy.engagement.observed * matrix.ew.observed.weight + b.fantasy.engagement.matched * matrix.ew.matched.weight
    );
    return { ...b, score: { engagement, pickems, weighted: engagement + pickems } };
  });

  const buckets = AMap.New<number | null>()(
    () => ({ ...blank(), rows: new AMap<number, (typeof scoring)[number]>() }),
    [...categoryIds, null]
  );

  for (const score of scoring) {
    const sums = { fantasy: score.fantasy, pickems: score.pickems, score: score.score };
    for (const cid of [score.categoryId, null]) {
      const bucket = buckets.compute(cid);
      sumScalars(bucket, sums);

      const viewer = bucket.rows.compute(score.viewer.id, () => ({ ...score, ...blank() }));
      sumScalars(viewer, sums);
    }
  }

  return {
    totals: [...buckets].map(([categoryId, bucket]) => ({
      category: categories.find(c => c.id === categoryId),
      fantasy: bucket.fantasy,
      pickems: bucket.pickems,
      scores: [...bucket.rows.values()]
        .sort((a, b) => b.score.weighted - a.score.weighted)
        .map((row, i) => ({ ...row, rank: i + 1 }))
    })),
    // =================================================
    // TDDO: remove 0.0.2 release
    summaries: {
      viewer: scoring.map(s => ({
        ...s,
        username: truncate(s.viewer.meta.username, 16),
        fantasy: { ...s.fantasy, observedPicks: 0, notObservedEvents: 0 }
      }))
    }
    // =================================================
  };
};
