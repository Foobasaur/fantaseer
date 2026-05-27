import ebs from '$lib/svelted/ebs';
import { sumScalars } from '$lib/utilz/morph';
import type { Server } from '@';
import type { LayoutLoad } from './$types';
import { lbizaMap } from '$lib/utilz/lbizaMap';

const dependz = 'app:layout:load';
export const load = async ({ fetch, depends, untrack, params }: Parameters<LayoutLoad>[0]) => {
  depends(dependz);
  const mode = untrack(() => params.mode);
  const data = await ebs({
    fetch,
    path: `/app/${params.game}${mode ? `/${mode}` : ''}`
  }).get<Server.EBS.Game>();

  const empty = () => ({
    fantasy: {
      drafts: 0,
      picks: 0,
      observedPicks: 0,
      notObservedEvents: 0,
      eventables: new Array<{ eventable: string; pickable: string; events: number }>()
    },
    pickems: { attempts: 0, hits: 0, misses: 0 },
    score: { engagement: 0, pickems: 0, weighted: 0 }
  });

  const buckets = new lbizaMap<number | null, ReturnType<typeof empty> & { rows: typeof data.summaries.viewer }>();
  for (const summary of data.summaries.viewer || []) {
    for (const cid of [summary.categoryId, null] as const) {
      const bucket = buckets.getOrCompute(cid, () => ({ ...empty(), rows: [] }));
      bucket.rows?.push(summary);
      sumScalars(bucket, summary);
    }
  }

  const totals = [...buckets].map(([categoryId, b]) => ({
    category: data.categories.find(c => c.id === categoryId),
    fantasy: b.fantasy,
    pickems: b.pickems,
    pickaroo:
      (data.summaries.catigory || []).find(c => c.categoryId === categoryId)?.pickaroo ||
      (data.summaries.catigory || []).reduce((acc, c) => ({ open: acc.open + c.pickaroo.open }), { open: 0 }),
    scores: [...Map.groupBy(b.rows || [], row => row.viewerId).values()]
      .map(group => {
        const merge = group.reduce((acc, curr) => sumScalars(acc, curr), empty());
        return { ...group[0], ...merge };
      })
      .sort((a, b) => b.score.weighted - a.score.weighted)
      .map((row, i) => ({ ...row, rank: i + 1 }))
  }));

  return { ...data, dependz, totals };
};
