import { db, tablez } from '$lib/server/db/client';
import type { Server } from '@';
import { and, eq, sql } from 'drizzle-orm';

const [players, viewers] = [tablez.players, tablez.viewers].map(target => {
  const key = target === tablez.viewers ? 'viewer' : 'player';
  const select = {
    id: target.id,
    meta: target.meta,
    userId: tablez.users.id,
    platform: tablez.identities.platform,
    platformId: tablez.identities.platformId,
    identityId: tablez.identities.id,
    identityMeta: tablez.identities.meta
  };
  return {
    // ─── By external identity (auth hot path) ────────────────
    platformId: db
      .select(select)
      .from(tablez.identities)
      .innerJoin(tablez.users, eq(tablez.users.id, tablez.identities.userId))
      .innerJoin(target, eq(target.identityId, tablez.identities.id))
      .where(
        and(
          eq(tablez.identities.platform, sql.placeholder('platform')),
          eq(tablez.identities.platformId, sql.placeholder('platformId'))
        )
      )
      .prepare(`resolve_${key}_by_identity`),
    platformIds: db
      .select(select)
      .from(tablez.identities)
      .innerJoin(tablez.users, eq(tablez.users.id, tablez.identities.userId))
      .innerJoin(target, eq(target.identityId, tablez.identities.id))
      .where(
        and(
          eq(tablez.identities.platform, sql.placeholder('platform')),
          sql`${tablez.identities.platformId} = ANY(${sql.placeholder('platformIds')})`
        )
      )
      .prepare(`resolve_${key}_by_identities`),
    // ─── By userId ─────────────────────────────────────────
    userId: db
      .select(select)
      .from(tablez.users)
      .innerJoin(tablez.identities, eq(tablez.identities.userId, tablez.users.id))
      .innerJoin(target, eq(target.identityId, tablez.identities.id))
      .where(eq(tablez.users.id, sql.placeholder('userId')))
      .prepare(`resolve_${key}_by_user`),
    // ─── By viewer.id | player.id  ─────────────────────────
    id: db
      .select(select)
      .from(target)
      .innerJoin(tablez.identities, eq(tablez.identities.id, target.identityId))
      .innerJoin(tablez.users, eq(tablez.users.id, tablez.identities.userId))
      .where(eq(target.id, sql.placeholder('id')))
      .prepare(`resolve_${key}_by_target`)
  };
});
type Target = 'viewers' | 'players';
type OIDC = { platform: string; platformId: string };
type Options = OIDC | { platform: string; platformIds: string[] } | { userId: string } | { id: number };
const getter =
  (key: Target) =>
  async <M>(opts: Options) => {
    const target = { viewers, players }[key];
    const [, query] = Object.entries(target).find(([k]) => k in opts)!;
    const exe = await query.execute(opts);
    return (exe ? exe : []).map(e => ({
      ...e,
      meta: (e.identityMeta as Record<typeof key, M>)[key]
    })) as Server.Auth.Identity<M>[];
  };
const upsert =
  (key: Target) =>
  async <M>({ meta: oidc, ...opts }: OIDC & { meta: M }) => {
    const meta = { [key]: oidc };
    await db.transaction(async tx => {
      await tx
        .insert(tablez[key])
        .values({
          identityId: await (async updated => {
            if (updated.length) return updated[0].id;
            const [user] = await tx.insert(tablez.users).values({}).returning();
            const [created] = await tx
              .insert(tablez.identities)
              .values({ ...opts, meta, userId: user.id })
              .returning({ id: tablez.identities.id });
            return created.id;
          })(
            await tx
              .update(tablez.identities)
              .set({
                updatedAt: new Date(),
                meta: sql`COALESCE(${tablez.identities.meta}, '{}'::jsonb) || ${JSON.stringify(meta)}::jsonb`
              })
              .where(and(eq(tablez.identities.platform, opts.platform), eq(tablez.identities.platformId, opts.platformId)))
              .returning({ id: tablez.identities.id })
          )
        })
        .onConflictDoNothing({ target: tablez[key].identityId });
    });

    return getter(key)<M>(opts);
  };

// ─── Public ──────────────────────────────────────────
export const Viewer = getter('viewers');
export const $Viewer = upsert('viewers');

export const Player = getter('players');
export const $Player = upsert('players');
