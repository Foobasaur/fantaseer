import { db, tablez } from '$lib/server/db/client';
import { $insert } from '$lib/server/db/kit';
import { Viewer } from '$lib/server/db/queries/identity';
import { chatters } from '$lib/server/twitch/api';
import { authenticate } from '$lib/server/twitch/auth';
import { PubSubServer } from '$lib/server/twitch/PubSubServer';
import { catchy } from '$lib/utilz/polly';
import type { DB } from '@';
import { error } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { inspect } from 'util';
import type { RequestHandler } from './$types';

// OnGameStart
// OnGameEnd
// OnPlayerMinionAttack
// OnOpponentMinionAttack
// OnEntityWillTakeDamage
// OnPlayerDraw
// OnOpponentPlay
const failed = (message: string) => error(412, message);
const PICKAROO_TRIGGERS = new Set(['OnGameStart', 'OnLobbyReady']) as ReadonlySet<string>;
const PICKAROO_RESOLVES = new Map<string, readonly string[]>([['OnPlayerDraw', ['OnGameStart']]]) as ReadonlyMap<
  string,
  readonly string[]
>;

interface Payload {
  mode: string;
  eventable: string;
  pickables: string[];
  meta?: { role?: 'player' | 'opponent'; turns?: number } & Record<string, unknown>;
}
export const POST: RequestHandler = ({ request, url }) =>
  catchy(async () => {
    const code = request.headers.get('x-game-code') || failed('Missing game-code header');
    const seed = url.searchParams.get('seed') || failed('Missing seed param');
    const mode = url.searchParams.get('mode') || failed('Missing mode param');
    const auth = await authenticate();
    const player = await auth.get();
    const game =
      (await db.query.games.findFirst({ where: { code }, with: { categories: true } })) || failed('Game not found');
    const { id: categoryId } = game.categories.find(c => c.mode === mode) || failed(`Category not found for ${mode}} mode`);

    const events: DB.Infertable<'Insert'>['events'][] = [];
    const pickaroos: DB.Infertable<'Insert'>['pickaroos'][] = [];
    const payload = (await request.json()) as Payload[];
    for (const { eventable, pickables, meta } of payload) {
      const values = { categoryId, playerId: player.id, eventable, meta: { ...meta, seed } };
      console.log('Processing event:', inspect({ values, pickables }, { depth: null, colors: true }));

      if (PICKAROO_TRIGGERS.has(eventable)) pickaroos.push({ ...values, pickables });
      for (const pickable of pickables) events.push({ ...values, pickable });
    }
    if (!events.length && !pickaroos.some(p => p.pickables.length)) failed('No valid events to process');
    // ... return { ..., dropped }

    // Process everything in a transaction, including the post-commit broadcast preparation (chatters, viewers)
    const { opened, inserted, resolved } = await db.transaction(async tx => {
      // 1. Upsert pickaroo opens (append-unique pickables)
      const opened =
        pickaroos.length &&
        (await tx
          .insert(tablez.pickaroos)
          .values(pickaroos)
          .onConflictDoUpdate({
            target: [tablez.pickaroos.categoryId, tablez.pickaroos.playerId, tablez.pickaroos.eventable],
            targetWhere: sql`${tablez.pickaroos.outcomeId} IS NULL`,
            set: {
              updatedAt: new Date(),
              pickables: sql`to_jsonb(ARRAY(
                  SELECT DISTINCT jsonb_array_elements_text(${tablez.pickaroos.pickables} || excluded.pickables)
                ))`
            }
          })
          .returning());

      // 2. Insert events
      const inserted = events.length && (await tx.insert(tablez.events).values(events).returning());

      // 3. First trigger per (category, pickaroo eventable) — lowest id wins
      const triggers = new Map<string, { categoryId: number; eventable: string; eventId: number }>();
      for (const e of [...(inserted || [])].sort((a, b) => a.id - b.id))
        for (const eventable of PICKAROO_RESOLVES.get(e.eventable) || []) {
          const key = `${e.categoryId}:${eventable}`;
          const turns = (e.meta as { turns: number })?.turns ?? 0;
          if (!triggers.has(key) && turns > 0 && turns% 3 === 0) {
            triggers.set(key, { categoryId: e.categoryId, eventable, eventId: e.id });
          }
        }

      // 4. Resolve open pickaroos + return affected pickems for broadcast
      const resolved =
        triggers.size &&
        (r => r.rows as (DB.Infertable['pickems'] & { eventable: string; eventPickable: string })[])(
          await tx.execute(sql`
              WITH resolved AS (
                UPDATE player_pickaroo pp
                SET "outcomeId" = d.event_id, "updatedAt" = NOW()
                FROM (VALUES ${sql.join(
                  [...triggers.values()].map(t => sql`(${t.categoryId}::int, ${t.eventable}::text, ${t.eventId}::int)`),
                  sql`, `
                )}) AS d(category_id, pickaroo_eventable, event_id)
                WHERE pp."categoryId" = d.category_id
                  AND pp.eventable = d.pickaroo_eventable
                  AND pp."playerId" = ${player.id}
                  AND pp."outcomeId" IS NULL
                RETURNING pp.id, pp."outcomeId"
              )
              SELECT vpp.*, e.eventable, e.pickable AS "eventPickable"
              FROM viewer_pickaroo_pick vpp
              JOIN resolved r ON vpp."pickarooId" = r.id
              JOIN player_event e ON r."outcomeId" = e.id
            `)
        );
      return { opened, inserted, resolved };
    });
    console.log(
      'Transaction complete. Opened pickaroos:',
      opened,
      'Inserted events:',
      inserted,
      'Resolved pickems:',
      resolved
    );

    // 6. Broadcast AFTER commit
    if (resolved && resolved.length) {
      await PubSubServer.I.broadcast(player.platformId, {
        event: 'pickems:updated',
        payload: resolved
      });
    }
    if (opened && opened.length) {
      await PubSubServer.I.broadcast(player.platformId, {
        event: 'pickaroos:updated',
        payload: opened
      });
    }
    if (inserted && inserted.length) {
      // Observers for chatters
      const chat = await chatters(player.platformId);
      const viewers = chat.length && (await Viewer({ platform: auth.opts.platform, platformIds: chat.map(c => c.user_id) }));
      const observed =
        viewers &&
        viewers.length &&
        (await $insert('observers')(viewers.flatMap(v => inserted.map(i => ({ eventId: i.id, viewerId: v.id })))));

      await PubSubServer.I.broadcast(player.platformId, {
        event: 'events:created',
        payload: inserted
      });
      return { resolved, opened, inserted, chat, viewers, observed };
    }

    return { resolved, opened };
  });
