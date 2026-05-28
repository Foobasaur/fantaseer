import { getRequestEvent } from '$app/server';
import { gg } from '$lib/core/games/games.server';
import { timer, timez } from '$lib/utilz/morph';
import type { DB, Server, Twitch } from '@';
import { error } from '@sveltejs/kit';
import { and, eq, getColumns } from 'drizzle-orm';
import { db, tablez } from './db/client';
import { $delete, $get, $insert, $update } from './db/kit';
import { $Viewer, Player } from './db/queries/identity';
import { scores } from './db/queries/summary';

const req = () => {
  const event = getRequestEvent();
  return {
    get event() {
      return event;
    },
    get user() {
      const user = this.event.locals.user || error(401, { message: 'Unauthorized' });
      return user;
    },
    get authenticated() {
      const user = this.user.authenticated || error(401, { message: 'Unauthenticated' });
      return user;
    },
    get jwt() {
      return this.user.jwt || error(401, { message: 'No JWT' });
    },
    async player(): Promise<Server.Auth.Identity<unknown> | undefined> {
      const [player] = await Player({ platform: 'twitch', platformId: this.jwt.channel_id });
      return player;
    },
    async module() {
      const [game] = await $get('games')({ where: { code: event.params.game } });
      const categories = await $get('categories')({ where: { gameId: game.id } });
      const category = categories.find(c => c.mode === event.params.mode);
      return {
        game,
        categories,
        category,
        player: await this.player(),
        module: await gg<{ id: string }>(game.code),
        user: { ...this.user, ...this.authenticated, jwt: this.jwt }
      };
    }
  };
};

export const games = async () => {
  const { user } = req();
  const games = await $get('games')();
  return { games, user: user.authenticated || user.anonymous };
};

export const game = async () => {
  const { module, game, categories, player } = await req().module();
  const rows = (s => ({
    ...s,
    summaries: s?.buckets.map(s => {
      const engagement = Math.round(
        s.fantasy.observedPicks * module.scores.ew.observed.weight +
          s.fantasy.notObservedEvents * module.scores.ew.picked.weight +
          s.fantasy.unpicked * module.scores.ew.unpicked.weight
      );
      const pickems = Math.round(
        s.pickems.hits * module.scores.pw.win.weight + (s.pickems.attempts * s.pickems.misses) / module.scores.pw.lose.weight
      );
      return { ...s, score: { engagement, pickems, weighted: engagement + pickems } };
    })
  }))(player && (await scores(categories, player.id)));
  return { player, game, categories, summaries: { viewer: rows.summaries, catigory: rows.cidbuckets } };
};

export const draft = async () => {
  const e = req();
  const { user, module, category, player } = await e.module();

  const TIME_BETWEEN_DRAFTS = timez.hour(12);
  const nexty = (drafts: DB.Infertable['drafts'][]) => {
    const open = drafts.find(e => e.createdAt.getTime() + TIME_BETWEEN_DRAFTS > Date.now());
    return open && timer(open.createdAt, TIME_BETWEEN_DRAFTS);
  };
  const eventy = async (opts: XOR<{ categoryId: DB.ColumnCondition<number> }, { id: DB.ColumnCondition<number> }>) => {
    const { categoryId = ['isNotNull'], id = ['isNotNull'] } = opts;
    const drafts =
      player &&
      (await $get('drafts')({
        where: { id, playerId: player.id, viewerId: user.id, categoryId }
      }));
    const picks = drafts && (await $get('picks')({ where: { draftId: ['inArray', drafts.map(d => d.id)] } }));
    const events =
      player &&
      drafts &&
      (await (minimummy =>
        minimummy &&
        $get('events')({
          where: {
            playerId: player.id,
            categoryId: ['inArray', drafts.map(d => d.categoryId)], // ← was just `categoryId` from opts
            pickable: ['inArray', [...minimummy.keys()]],
            createdAt: ['gte', new Date(Math.min(...[...minimummy.values()].map(d => d.getTime())))] // ← floor, still need per-pickable filter below
          }
        }).then(t =>
          t.filter(e => {
            const earliest = minimummy.get(e.pickable);
            return earliest !== undefined && e.createdAt >= earliest;
          })
        ))(
        picks &&
          picks.length &&
          picks.reduce((map, p) => {
            const prior = map.get(p.pickable);
            if (!prior || p.createdAt < prior) map.set(p.pickable, p.createdAt);
            return map;
          }, new Map<string, Date>())
      ));

    // Then use findMany (no RAW) to get events + observers
    const observers = events && (await $get('observers')({ where: { id: ['inArray', events.map(r => r.id)] } }));
    return { drafts: drafts?.map(d => ({ ...d, timez: timer(d.createdAt, TIME_BETWEEN_DRAFTS) })), picks, events, observers };
  };
  return {
    fantasy: async () => {
      // Load user's drafts for this category
      const { drafts, picks, events, observers } = await eventy({ categoryId: Number(category?.id) || ['isNotNull'] });
      const open = drafts && category && nexty(drafts);

      return { picks, events, observers, drafts, open };
    },
    get: async () => {
      // const data = { pickables, draftables, draft: null };
      if (e.event.params.draft === 'new')
        return { pickables: module.pickables(category?.mode), draftables: module.draftables(category?.mode), draft: null };

      // Validate draft ownership and load picks.
      const { drafts = [], picks = [], events, observers } = await eventy({ id: Number(e.event.params.draft) });
      return {
        events,
        observers,
        draft: { ...drafts[0], picks, pickables: module.fromPickable(picks.map(p => p.pickable)) }
      };
    },
    post: async <T extends { id: string }>() => {
      const opts = (await e.event.request.json()) as { picks: T[] };
      return await db.transaction(async tx => {
        const existing = await tx
          .select()
          .from(tablez.drafts)
          .where(
            and(
              eq(tablez.drafts.viewerId, user.id),
              eq(tablez.drafts.categoryId, category!.id),
              eq(tablez.drafts.playerId, player!.id)
            )
          );
        const recent = nexty(existing);
        if (recent) error(400, `You can draft again at ${recent.nextStr}`);
        const [draft] = await tx
          .insert(tablez.drafts)
          .values({ viewerId: user.id, playerId: player!.id, categoryId: category!.id })
          .returning({ id: tablez.drafts.id });
        const picks = await tx
          .insert(tablez.picks)
          .values(opts.picks.map(pick => ({ draftId: draft.id, pickable: module.toPickable(pick) })))
          .returning();
        return { draft, picks };
      });
    }
  };
};
export const pickaroo = async () => {
  const e = req();
  const { user, module, category, player } = await e.module();
  return {
    get: async () => {
      // Hydrate pickable IDs into game-module display data
      const pickaroos = (rows =>
        rows
          ?.map(p => ({ ...p, pickables: p.pickables.map(id => module.fromPickable(id)).filter(Boolean) }))
          .filter(roo => roo.pickables.length))(
        player &&
          (await $get('pickaroos')({
            where: { playerId: player.id, categoryId: category ? category.id : ['isNotNull'], outcomeId: ['isNull'] }
          }))
      );

      // Viewer's pickems with hit/miss derived from the join chain
      const pickems = await db
        .select({
          ...getColumns(tablez.pickems),
          eventable: tablez.events.eventable,
          eventPickable: tablez.events.pickable
        })
        .from(tablez.pickems)
        .innerJoin(tablez.pickaroos, eq(tablez.pickaroos.id, tablez.pickems.pickarooId))
        .leftJoin(tablez.events, eq(tablez.events.id, tablez.pickaroos.outcomeId))
        .where(and(eq(tablez.pickems.viewerId, user.id), category && eq(tablez.pickems.categoryId, category.id)));

      return { pickaroos, pickems };
    },

    post: async <T extends { id: string }>() => {
      const opts = (await e.event.request.json()) as { pick: T; pickarooId: number };
      const [inserted] = await $insert('pickems')({
        categoryId: category!.id,
        viewerId: user.id,
        playerId: player!.id,
        pickarooId: opts.pickarooId,
        pickable: module.toPickable(opts.pick)
      });
      return inserted;
    }
  };
};
export const configure = () => {
  const e = req();
  return {
    async get() {
      const events = await $get('events')({ where: { playerId: e.authenticated.id } });
      const drafts = await $get('drafts')({ where: { playerId: e.authenticated.id } });
      const banned = await $get('banned')({ where: { playerId: e.authenticated.id } });
      const viewers = await $get('viewers')<{ username: string; avatar: string; helix: Twitch.Ext.HelixUser }>({
        where: {
          id: ['inArray', [...new Set([...drafts.map(d => d.viewerId), ...banned.map(b => b.viewerId)])]]
        }
      });
      return { viewers, drafts, banned, events, player: await e.player() };
    },
    async post() {
      const body = await e.event.request.json();
      const options = {
        viewer: async (meta: Twitch.Ext.HelixUser) => {
          const jwt = e.user.jwt || error(401, { message: 'No Jwt' });
          const [viewer] = await $Viewer({
            platform: 'twitch',
            platformId: jwt.user_id!,
            meta
          });
          return await $update('viewers')({
            id: viewer.id,
            identityId: viewer.identityId
          })({ meta: { username: meta.display_name, avatar: meta.profile_image_url } });
        },
        broadcaster: async ({ action, ids }: { action: string; ids: number[] }) => {
          const actions = {
            // Delete drafts added to player channel
            disqualify: async () => {
              await $delete('drafts')({ where: { id: ['inArray', ids] } });
            },

            // Ban viewer from participating
            ban: () => $insert('banned')(ids.map(viewerId => ({ viewerId, playerId: e.authenticated.id }))),
            unban: () => $delete('banned')({ where: { playerId: e.authenticated.id, id: ['inArray', ids] } }),

            // Clear Player / Broadcaster event history
            clear: async () => {
              return await $delete('events')({ where: { id: ['inArray', ids] } });
            }
          };
          await actions[action as keyof typeof actions]();
          return await this.get();
        }
      };
      return options[e.event.params.kind as keyof typeof options](body);
    }
  };
};
