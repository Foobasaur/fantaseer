import { db, tablez } from '$lib/server/db/client';
import { $insert } from '$lib/server/db/kit';
import { Viewer } from '$lib/server/db/queries/identity';
import { chatters } from '$lib/server/twitch/api';
import { authenticate } from '$lib/server/twitch/auth';
import { PubSubServer } from '$lib/server/twitch/PubSubServer';
import { catchy, delay } from '$lib/utilz/polly';
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
const PICKAROO_TRIGGERS = new Set(['OnGameStart', 'OnLobbyReady', 'OnTurnStart']) as ReadonlySet<string>;
const PICKAROO_RESOLVES = new Map<string, readonly string[]>([
  ['OnPlayerDraw', ['OnGameStart', 'OnTurnStart']],
  ['OnRoundPlacement', ['OnLobbyReady', 'OnTurnStart']]
]) as ReadonlyMap<string, readonly string[]>;

interface Payload {
  mode: string;
  eventable: string;
  pickables: string[];
  meta?: { role?: 'player' | 'opponent'; turns?: number } & Record<string, unknown>;
}
export const POST: RequestHandler = ({ request, url }) =>
  catchy(async () => {
    const code = request.headers.get('x-game-code') || failed('Missing game-code header');
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
      const values = { categoryId, playerId: player.id, eventable, meta };
      console.log('Processing event:', inspect({ values, pickables }, { depth: null, colors: true }));

      if (PICKAROO_TRIGGERS.has(eventable)) pickaroos.push({ ...values, pickables });
      else for (const pickable of pickables) events.push({ ...values, pickable });
    }
    if (!events.length && !pickaroos.some(p => p.pickables.length)) failed('No valid events to process');
    // ... return { ..., dropped }

    // Process everything in a transaction, including the post-commit broadcast preparation (chatters, viewers)
    const { opened, inserted, pickems } = await db.transaction(async tx => {
      // 1. Upsert pickaroo opens (append-unique pickables)
      const opened =
        pickaroos.length &&
        (await tx
          .insert(tablez.pickaroos)
          .values(
            Array.from(
              Map.groupBy(pickaroos, p => `${p.categoryId}\u0000${p.playerId}\u0000${p.eventable}`).values(),
              group => ({
                ...group.at(-1)!, // representative row
                pickables: [...new Set(group.flatMap(p => p.pickables))]
              })
            )
          )
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
          if (triggers.has(key)) continue;
          else {
            console.log('Evaluating trigger for pickaroo:', { key, ...e });
            const { turns = 0, place = 1 } = e.meta as { turns?: number; place?: number };
            // trigger on non-milestone turn (>1, not %3) or 1st place
            if (turns < 3 || place !== 1) continue;
            else if (turns % 3 === 0 || eventable === 'OnRoundPlacement') {
              const value = { categoryId: e.categoryId, eventable, eventId: e.id };
              triggers.set(key, value);
            }
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
      return { opened, inserted, pickems: { resolved, triggers: [...triggers] } };
    });

    const evented = {
      ...(opened && opened.length && { 'pickaroos:updated': opened }),
      ...(pickems.triggers.length && { 'pickems:updated': pickems }),
      ...(inserted && inserted.length && { 'events:created': inserted })
    };
    console.log('Evented:', inspect({ evented }, { depth: null, colors: true }));

    if (inserted && inserted.length) {
      // Observers for chatters
      const chat = await chatters(player.platformId);
      const viewers = chat.length && (await Viewer({ platform: auth.opts.platform, platformIds: chat.map(c => c.user_id) }));
      const observed =
        viewers &&
        viewers.length &&
        (await $insert('observers')(viewers.flatMap(v => inserted.map(i => ({ eventId: i.id, viewerId: v.id })))));
    }

    await PubSubServer.I.broadcast(player.platformId, { events: Object.keys(evented) });
    return evented;
  });
