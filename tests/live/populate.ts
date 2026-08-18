/**
 * Live-DB populator — funky viewers, already-scored drafts, and already-resolved pickems.
 *
 * Reads what the live DB already holds (`game` → `game_category` → `player` → `player_event`) and layers a
 * synthetic *audience* on top of it: viewers with twitchary-doo-da-doodly-do handles, backdated drafts whose
 * picks already match real events, observer rows so those matches land in the "perfect pick" bucket, and
 * pickaroos resolved against real events so the pickems carry real hits and misses.
 *
 * No pre-existing row is ever updated or deleted, and games, categories and players are only ever read — see
 * "Local mode" below for the one place that is relaxed, and why it is safe there. Every row this writes is
 * stamped `meta.seed = <tag>` and every seeded identity uses `<tag>` as its `platform`, so `purge()` can take
 * exactly this data back out again.
 *
 * The one exception to "reads player data, never writes it" is bootstrapping: a mode with *zero* events can
 * carry no scored drafts, because scoring needs real events to match against. So a category holding nothing
 * gets synthetic `player_event` rows (tagged like everything else) borrowed from a donor mode of the same
 * family — Battlegrounds is its own family, the constructed modes share one. A mode that already has live
 * events is never topped up: real activity is never diluted. See SEED_BOOTSTRAP.
 *
 * ── Local mode ──────────────────────────────────────────────────────────────────────────────────────────
 * A live database already holds a game, its modes, a broadcaster and that broadcaster's play history; a fresh
 * `docker compose up` holds none of it, so there is nothing for the audience to sit on. Local mode builds that
 * floor first (see ensureFoundation) and then runs the *same* planner and writer as a live run, so the local
 * app shows what the live seed produces. It is armed by SEED_LOCAL=1 or by VITE_TARGET=mock, needs no
 * LIVE_SEED, and refuses any DATABASE_URL that is not a loopback host. Because everything under it is this
 * script's own work, local mode is the one place games, categories and the broadcaster are written — and
 * purged. It is the only mode that deletes rows it did not create in the same run.
 *
 * ── Workflow ────────────────────────────────────────────────────────────────────────────────────────────
 *   live:   terminal 1:  bash .scripts/rds.sh <stage>  # opens the SSH tunnel, prints DATABASE_URL
 *           terminal 2:  DATABASE_URL="<printed>" LIVE_SEED=1 npm run db:populate
 *
 *   local:  terminal 1:  npm run db:start              # the compose.yaml postgres on :5433
 *           terminal 2:  npm run db:push               # schema, once
 *           terminal 3:  npm run db:populate:local     # purges and rebuilds; then: npm run dev:bang
 *
 * ── Knobs (all optional except the two above) ───────────────────────────────────────────────────────────
 *   SEED_DRY=1            plan + report, write nothing
 *   SEED_PURGE=1|only     delete previously seeded rows first ("only" = delete and stop)
 *   SEED_TAG              marker written to meta.seed / identities.platform (default "doodly")
 *   SEED_VIEWERS          how many funky viewers to mint (default 12)
 *   SEED_DRAFTS           drafts per viewer per player+category pair (default 2)
 *   SEED_PICKS            picks per draft (default 5)
 *   SEED_PICKAROOS        resolved pickaroos per pair (default 3)
 *   SEED_OPEN_PICKAROOS   still-open pickaroos per pair, for the UI to vote on (default 1)
 *   SEED_OPTIONS          pickables offered per pickaroo (default 4)
 *   SEED_PAIRS            max player+category pairs a single viewer engages with (default 4)
 *   SEED_PAIR_EVENTS      newest events considered per pair — bounds observer volume (default 250)
 *   SEED_EVENT_LIMIT      newest events read from the live DB overall (default 20000)
 *   SEED_LEAD_HOURS       how far ahead of the newest event a draft is backdated (default 13)
 *   SEED_BOOTSTRAP        "auto" (default) fills every mode holding zero events; "off" fills none;
 *                         or a comma list of modes, e.g. "Wild,Arena" — still only if they hold zero events
 *   SEED_BOOTSTRAP_EVENTS synthetic events per bootstrapped mode, and per mode of the local foundation (250)
 *   SEED_BOOTSTRAP_DAYS   days of history those events are spread across (default 14)
 *   SEED_LOCAL=1          target the local dev DB and build the foundation a live DB already has. Implied by
 *                         VITE_TARGET=mock; SEED_LOCAL=0 turns it back off. LIVE_SEED is not required here.
 *   SEED_LOCAL_CHANNEL    the broadcaster's twitch id (default "174152420" — the channel_id that the dev
 *                         fallback in src/lib/server/auth.ts hands out, which is how ebs resolves the player)
 *   SEED_GAME             only seed this game code, e.g. "HS"
 *   SEED_PLAYERS          only seed these player ids, e.g. "3,7"
 *   SEED_RNG              PRNG seed — same value reproduces the same names and picks (default "doodly-doo")
 */
import {
  categories,
  drafts,
  events,
  games,
  identities,
  observers,
  pickaroos,
  pickems,
  picks,
  players,
  users,
  viewers
} from '$lib/server/db/.sql/tables';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgColumn } from 'drizzle-orm/pg-core';

export type Db = ReturnType<typeof drizzle>;

// ============================================================
// CONFIG
// ============================================================

export type Config = {
  url: string;
  local: boolean;
  channelId: string;
  tag: string;
  viewers: number;
  draftsPerViewer: number;
  picksPerDraft: number;
  resolvedPickaroos: number;
  openPickaroos: number;
  options: number;
  pairsPerViewer: number;
  pairEvents: number;
  eventLimit: number;
  leadHours: number;
  bootstrap: 'auto' | 'off' | string[];
  bootstrapEvents: number;
  bootstrapDays: number;
  gameCode?: string;
  playerIds: number[];
  rng: string;
  dry: boolean;
  purge: 'no' | 'yes' | 'only';
};

/** The compose.yaml postgres, and the default DATABASE_URL everything else in the repo falls back to. */
export const LOCAL_URL = 'postgres://root:mysecretpassword@localhost:5433/local';

/** Mirrors MODES in src/lib/core/games/HS/types.d.ts, which is a declaration file and carries no runtime value. */
export const LOCAL_MODES = ['Standard', 'Arena', 'Wild', 'Battlegrounds'] as const;

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

/** The one thing standing between "seed my dev box" and "seed production", so it is a host check, not a name check. */
export const isLoopback = (url: string) => {
  try {
    return LOOPBACK.has(new URL(url).hostname);
  } catch {
    return false;
  }
};

/** VITE_TARGET=mock is how the dev server is started, so it doubles as the signal to target the dev database. */
export const isLocal = (env: NodeJS.ProcessEnv = process.env) =>
  env.SEED_LOCAL ? !['0', 'no', 'off', 'false'].includes(env.SEED_LOCAL.toLowerCase()) : env.VITE_TARGET === 'mock';

/** Both live switches are deliberate: nothing runs against a live DB by accident. Local needs neither. */
export const isArmed = (env: NodeJS.ProcessEnv = process.env) =>
  isLocal(env) || (Boolean(env.DATABASE_URL) && env.LIVE_SEED === '1');

/**
 * `VITE_TARGET=mock vite dev` reads DATABASE_URL through $env/dynamic/private — that is, out of `.env` — so the
 * populator has to read the same file or it would seed a different database than the one the dev server talks
 * to. Shell values still win over the file, exactly as they do for vite. Falls back to process.env alone if
 * vite cannot be loaded, which only costs the `.env` lookup.
 */
export const environ = async (): Promise<NodeJS.ProcessEnv> => {
  try {
    const { loadEnv } = await import('vite');
    return { ...loadEnv('development', process.cwd(), ''), ...process.env };
  } catch {
    return process.env;
  }
};

export const readConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
  const local = isLocal(env);
  const url = env.DATABASE_URL || (local ? LOCAL_URL : '');

  if (!url)
    throw new Error('DATABASE_URL is required — run `bash .scripts/rds.sh <stage>` and reuse the URL it prints.');
  if (local && !isLoopback(url))
    throw new Error(
      `Local mode refuses "${url.replace(/(\/\/[^:/@]*:)[^@]*@/, '$1***@')}" — it is not a loopback host. Local mode ` +
        'builds and deletes games, categories and a broadcaster, which is only ever safe on a disposable dev DB. ' +
        'Unset SEED_LOCAL and VITE_TARGET to seed a remote database the live way (LIVE_SEED=1).'
    );
  if (!local && env.LIVE_SEED !== '1')
    throw new Error('LIVE_SEED=1 is required — this writes to whatever DATABASE_URL points at, live included.');

  const num = (key: string, fallback: number) => {
    const raw = env[key];
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    url,
    local,
    channelId: env.SEED_LOCAL_CHANNEL || '174152420',
    tag: env.SEED_TAG || 'doodly',
    viewers: num('SEED_VIEWERS', 12),
    draftsPerViewer: num('SEED_DRAFTS', 2),
    picksPerDraft: num('SEED_PICKS', 5),
    resolvedPickaroos: num('SEED_PICKAROOS', 3),
    openPickaroos: num('SEED_OPEN_PICKAROOS', 1),
    options: num('SEED_OPTIONS', 4),
    pairsPerViewer: num('SEED_PAIRS', 4),
    pairEvents: num('SEED_PAIR_EVENTS', 250),
    eventLimit: num('SEED_EVENT_LIMIT', 20000),
    leadHours: num('SEED_LEAD_HOURS', 13),
    bootstrap:
      !env.SEED_BOOTSTRAP ? 'auto'
      : ['off', 'no', '0'].includes(env.SEED_BOOTSTRAP.toLowerCase()) ? 'off'
      : env.SEED_BOOTSTRAP.split(',')
          .map(mode => mode.trim())
          .filter(Boolean),
    bootstrapEvents: num('SEED_BOOTSTRAP_EVENTS', 250),
    bootstrapDays: num('SEED_BOOTSTRAP_DAYS', 14),
    gameCode: env.SEED_GAME || undefined,
    // Split first, drop blanks, *then* parse — Number('') is 0, which would silently filter every event out.
    playerIds: (env.SEED_PLAYERS || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)
      .map(id => Number(id))
      .filter(Number.isFinite),
    rng: env.SEED_RNG || 'doodly-doo',
    dry: env.SEED_DRY === '1',
    purge: env.SEED_PURGE === 'only' ? 'only' : env.SEED_PURGE === '1' ? 'yes' : 'no'
  };
};

// ============================================================
// SEEDED RANDOMNESS
// ============================================================

const hashed = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** mulberry32 — same SEED_RNG replays the same audience, which makes a live re-run predictable. */
export const rando = (seed: string) => {
  let a = hashed(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const shuffle = <T>(items: readonly T[]) => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return {
    next,
    shuffle,
    chance: (p: number) => next() < p,
    range: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    choice: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)],
    sample: <T>(items: readonly T[], count: number) => shuffle(items).slice(0, Math.max(0, count))
  };
};

export type Rando = ReturnType<typeof rando>;

// ============================================================
// FUNKY HANDLES
// ============================================================

const FUNK = {
  prefix: ['xX', 'Lil', 'Big', 'Uncle', 'DJ', 'Sir', 'Capn', 'Mega', 'TheReal', 'Doctor', 'Baron', 'Sneaky', 'Grand'],
  core: [
    'Twitchary',
    'Doodly',
    'Noodly',
    'Wiggleworth',
    'Boopsnoot',
    'Snaccident',
    'Wobblesworth',
    'Gigglefritz',
    'Pickleback',
    'Yeetus',
    'Bamboozle',
    'Flapjack',
    'Squibbly',
    'Zoinkers',
    'Frobscottle',
    'Mcnugget',
    'Kerfuffle',
    'Whomstve',
    'Blorbo',
    'Bingus',
    'Wumbo',
    'Skibbity'
  ],
  suffix: [
    'DooDaDoodlyDoo',
    'McPickface',
    'VonPickems',
    'Supreme',
    '9000',
    'TheThird',
    'OfTheYeet',
    'Prime',
    'TTV',
    'Xx',
    'Deluxe',
    'Jr',
    'DoDoo'
  ]
} as const;

/** Twitch's own default profile pictures — real, public, and obviously not a person. */
const AVATARS = [
  '998f01ae-def8-11e9-b95c-784f43822e80',
  'ce57700a-def9-11e9-842d-784f43822e80',
  'cd39ff98-def9-11e9-8681-784f43822e80',
  '215b7342-def9-11e9-9a66-784f43822e80',
  'de130ab0-def7-11e9-b668-784f43822e80'
].map(id => `https://static-cdn.jtvnw.net/user-default-pictures-uv/${id}-profile_image-300x300.png`);

export const funkyNames = (count: number, rand: Rando) => {
  const names = new Set<string>();
  for (let guard = 0; names.size < count && guard < count * 200; guard++) {
    const [prefix, core, suffix] = [rand.choice(FUNK.prefix), rand.choice(FUNK.core), rand.choice(FUNK.suffix)];
    names.add(rand.chance(0.5) ? `${prefix}_${core}_${suffix}` : `${core}${suffix}`);
  }
  // Pool exhaustion is only reachable at absurd viewer counts; number the leftovers rather than loop forever.
  while (names.size < count) names.add(`${rand.choice(FUNK.core)}_${names.size + 1}`);
  return [...names].slice(0, count);
};

// ============================================================
// VIEWER PROFILES
// ============================================================

/**
 * `cut` decides how far into a pair's event timeline the viewer's draft lands: an early cut leaves more
 * events matchable, a late cut leaves fewer. Everything else feeds the three engagement buckets that
 * `src/lib/server/db/queries/summary.ts` counts — observed picks, picked-but-unobserved, observed-but-unpicked.
 */
export type Profile = {
  type: string;
  cut: number;
  observeRate: number;
  pickAccuracy: number;
  pickemRate: number;
  pickemAccuracy: number;
};

export const profiles: Profile[] = [
  { type: 'whale', cut: 0.0, observeRate: 0.9, pickAccuracy: 0.85, pickemRate: 0.95, pickemAccuracy: 0.8 },
  { type: 'regular', cut: 0.25, observeRate: 0.6, pickAccuracy: 0.6, pickemRate: 0.7, pickemAccuracy: 0.5 },
  { type: 'lurker', cut: 0.45, observeRate: 0.85, pickAccuracy: 0.25, pickemRate: 0.4, pickemAccuracy: 0.35 },
  { type: 'sniper', cut: 0.15, observeRate: 0.2, pickAccuracy: 0.9, pickemRate: 0.6, pickemAccuracy: 0.75 },
  { type: 'bot', cut: 0.6, observeRate: 0.05, pickAccuracy: 0.2, pickemRate: 1.0, pickemAccuracy: 0.2 },
  { type: 'lucky', cut: 0.35, observeRate: 0.7, pickAccuracy: 1.0, pickemRate: 0.5, pickemAccuracy: 1.0 }
];

/** Mirrors `hs.scores` in src/lib/core/games/HS/hs.server.ts — kept local so this script never boots the game module. */
export const weights = { observed: 90, picked: 30, unpicked: 10, win: 50, lose: 2 } as const;

// ============================================================
// LOCAL FOUNDATION: the floor a live DB already has
// ============================================================

/** Battlegrounds is its own shape — heroes, placements — so it never donates to a constructed mode, or vice versa. */
const family = (mode: string) => (mode === 'Battlegrounds' ? 'bg' : 'constructed');

/**
 * Card-bearing eventables only. The ones api/events/player/+server.ts routes to `player_pickaroo` instead
 * (OnGameStart, OnLobbyReady, OnTurnStart) are deliberately absent: those open a pickaroo, they are not events.
 */
const EVENTABLES: Record<'constructed' | 'bg', readonly string[]> = {
  constructed: [
    'OnPlayerDraw',
    'OnPlayerPlay',
    'OnPlayerGet',
    'OnPlayerMulligan',
    'OnPlayerPlayToGraveyard',
    'OnOpponentPlay',
    'OnOpponentSecretTriggered'
  ],
  bg: ['OnRoundPlacement', 'OnPlayerPlay', 'OnPlayerGet', 'OnPlayerMinionAttack']
};

/**
 * How many distinct cards the synthetic broadcaster is treated as owning per mode. Drawing 250 events out of
 * Wild's several thousand legal cards would give almost every event its own pickable, which is nothing like a
 * streamer replaying a handful of decks — and it is repetition that gives pickaroo decoys and miss-picks
 * something to be wrong about.
 */
const COLLECTION = 48;

export type Foundation = {
  gameId: number;
  categories: { id: number; mode: string }[];
  playerId: number;
  events: number;
  reused: boolean;
  notes: string[];
};

/**
 * The pickables the app can actually render. `hs.pickables(mode)` is `cards.filter(c => legal[mode].includes(c.id))`,
 * so a legal id only counts once it has survived CDN()'s de-duplication — anything else comes back undefined from
 * module.fromPickable, and the UI silently drops the card, the draft row, or the whole pickaroo.
 *
 * Imported dynamically so a live run never pays for (or trips over) the 45MB card cache it has no use for.
 */
const cardPool = async (rand: Rando) => {
  const { default: CDN } = await import('$lib/core/games/HS/common/cdn');
  const contents = await CDN();
  const known = new Set(contents.cards.map(c => c.id));
  return new Map<string, string[]>(
    LOCAL_MODES.map(mode => [mode, rand.sample(contents[mode].filter(id => known.has(id)), COLLECTION)])
  );
};

/**
 * `viewer.id` and `player.id` are GENERATED ALWAYS identities whose sequences outlive a purge, so a second local
 * run would start handing out 13, 14, … That matters because the dev fallback in src/lib/server/auth.ts signs you
 * in as `Viewer({ id: 1 })`, and ebs.configure reads the broadcaster's own rows as `player.id`. Only ever run
 * against an empty table, so it can never renumber a row anything already points at.
 */
const restart = async (db: Db, table: 'viewer' | 'player') => {
  const [row] = await db.select({ total: sql<number>`COUNT(*)::int` }).from(table === 'viewer' ? viewers : players);
  if (row?.total) return false;
  await db.execute(
    table === 'viewer' ?
      sql`ALTER TABLE "viewer" ALTER COLUMN "id" RESTART WITH 1`
    : sql`ALTER TABLE "player" ALTER COLUMN "id" RESTART WITH 1`
  );
  return true;
};

/**
 * Builds what a live database already has and a fresh one does not: the HS game row, its four modes, the
 * broadcaster the dev auth fallback resolves to, and that broadcaster's play history. Everything above this —
 * viewers, drafts, picks, observers, pickaroos, pickems — is left to readLive/planSeed/writeSeed, unchanged, so
 * local and live produce the same shape of audience.
 *
 * Idempotent: each piece is created only if it is missing, and a database that already has all four is returned
 * as it stands. Every row it writes is stamped `meta.seed = <tag>` like the rest, so purge takes it back out.
 */
export const ensureFoundation = async (db: Db, cfg: Config): Promise<Foundation> => {
  if (cfg.gameCode && cfg.gameCode !== 'HS')
    throw new Error(`Local mode can only build the HS foundation — SEED_GAME="${cfg.gameCode}" has no card pool to draw from.`);

  const rand = rando(`${cfg.rng}:foundation`);
  const stamp = { seed: cfg.tag };
  const notes: string[] = [];

  // ── what is already there ────────────────────────────────────────────────────────────────────────────
  const [found] = await db.select().from(games).where(eq(games.code, 'HS'));
  const existing = found ? await db.select().from(categories).where(eq(categories.gameId, found.id)) : [];
  const [broadcaster] = await db
    .select({ id: players.id })
    .from(players)
    .innerJoin(identities, eq(identities.id, players.identityId))
    .where(and(eq(identities.platform, 'twitch'), eq(identities.platformId, cfg.channelId)));
  const played = new Set(
    broadcaster ?
      (
        await db
          .select({ categoryId: events.categoryId })
          .from(events)
          .where(eq(events.playerId, broadcaster.id))
          .groupBy(events.categoryId)
      ).map(row => row.categoryId)
    : []
  );

  const wantModes = LOCAL_MODES.filter(mode => !existing.some(c => c.mode === mode));
  const wantEvents = LOCAL_MODES.filter(mode => {
    const category = existing.find(c => c.mode === mode);
    return !category || !played.has(category.id);
  });

  const gaps = [
    !found && 'the HS game row',
    wantModes.length > 0 && `${wantModes.length} mode(s) (${wantModes.join(', ')})`,
    !broadcaster && `the broadcaster twitch:${cfg.channelId}`,
    wantEvents.length > 0 && `play history for ${wantEvents.join(', ')}`
  ].filter((gap): gap is string => Boolean(gap));

  // A dry run writes nothing, and there is nothing to plan against until the floor exists.
  if (cfg.dry && gaps.length)
    throw new Error(
      `SEED_DRY=1 has nothing to plan against — this database is still missing ${gaps.join(', ')}. Run once ` +
        'without SEED_DRY to build the local foundation, then dry-run against it.'
    );

  // Before the early return, not after: a purge can empty the viewer table without touching anything else here,
  // and writeSeed still wants its first viewer to be #1.
  if (!cfg.dry && (await restart(db, 'viewer')))
    notes.push('viewer ids restarted at 1 — the dev fallback signs you in as #1');

  if (found && broadcaster && !wantModes.length && !wantEvents.length)
    return {
      gameId: found.id,
      categories: existing.map(c => ({ id: c.id, mode: c.mode })),
      playerId: broadcaster.id,
      events: 0,
      reused: true,
      notes: [...notes, `reused the foundation already in place — game #${found.id}, player #${broadcaster.id}`]
    };

  // ── game + modes ─────────────────────────────────────────────────────────────────────────────────────
  let game = found;
  if (!game) {
    [game] = await db
      .insert(games)
      .values({ name: 'Hearthstone', code: 'HS', description: 'Digital collectible card game', meta: stamp })
      .returning();
    notes.push(`minted the HS game row (#${game.id})`);
  }

  const minted =
    wantModes.length ?
      await db
        .insert(categories)
        .values(wantModes.map(mode => ({ gameId: game.id, mode, meta: stamp })))
        .returning()
    : [];
  if (minted.length) notes.push(`minted ${minted.length} mode(s): ${minted.map(c => c.mode).join(', ')}`);
  const all = [...existing, ...minted].filter(c => (LOCAL_MODES as readonly string[]).includes(c.mode));

  // ── broadcaster ──────────────────────────────────────────────────────────────────────────────────────
  let playerId = broadcaster?.id;
  if (playerId == null) {
    if (await restart(db, 'player')) notes.push('player ids restarted at 1 — /configure reads the broadcaster as #1');

    // The identity may already exist as a viewer's: (platform, platformId) is unique, so attach to it rather than
    // trying to mint a second one.
    const [reusable] = await db
      .select({ id: identities.id })
      .from(identities)
      .where(and(eq(identities.platform, 'twitch'), eq(identities.platformId, cfg.channelId)));

    let identityId = reusable?.id;
    if (identityId == null) {
      const [user] = await db.insert(users).values({}).returning({ id: users.id });
      // Shape mirrors ebs.configure's $Player upsert: identities.meta.player holds the Helix user.
      const [made] = await db
        .insert(identities)
        .values({
          userId: user.id,
          platform: 'twitch',
          platformId: cfg.channelId,
          meta: {
            ...stamp,
            player: {
              id: cfg.channelId,
              login: 'fantaseer_local',
              display_name: 'Fantaseer Local',
              profile_image_url: AVATARS[0],
              offline_image_url: '',
              description: 'Seeded broadcaster — tests/live/populate.ts',
              broadcaster_type: 'affiliate',
              type: '',
              view_count: 0,
              created_at: new Date().toISOString()
            }
          }
        })
        .returning({ id: identities.id });
      identityId = made.id;
    }

    const [row] = await db
      .insert(players)
      .values({ identityId, meta: { ...stamp, username: 'Fantaseer Local' } })
      .returning({ id: players.id });
    playerId = row.id;
    notes.push(`minted the broadcaster twitch:${cfg.channelId} as player #${playerId}`);
  }

  // ── play history ─────────────────────────────────────────────────────────────────────────────────────
  const pool = wantEvents.length ? await cardPool(rand) : new Map<string, string[]>();
  const span = cfg.bootstrapDays * 24 * 60 * 60 * 1000;
  const anchor = Date.now();
  const rows: (typeof events.$inferInsert)[] = [];
  const filled: string[] = [];

  for (const mode of wantEvents) {
    const category = all.find(c => c.mode === mode)!;
    const pickables = pool.get(mode) ?? [];
    if (!pickables.length) {
      notes.push(`${mode} has no hydratable cards in the CDN cache — skipped, so its pages stay empty.`);
      continue;
    }
    filled.push(mode);
    const eventables = EVENTABLES[family(mode)];
    for (let i = 0; i < cfg.bootstrapEvents; i++)
      rows.push({
        categoryId: category.id,
        playerId,
        eventable: rand.choice(eventables),
        pickable: rand.choice(pickables),
        // Spread across the recent past, oldest first, so drafts have somewhere to be backdated to.
        createdAt: new Date(anchor - span + Math.floor(((i + rand.next()) / cfg.bootstrapEvents) * span)),
        meta: { ...stamp, base: true, mode }
      });
  }
  for (const batch of chunks(rows, 2000)) await db.insert(events).values(batch);
  if (rows.length) notes.push(`minted ${rows.length} events across ${filled.length} mode(s): ${filled.join(', ')}`);

  return {
    gameId: game.id,
    categories: all.map(c => ({ id: c.id, mode: c.mode })),
    playerId,
    events: rows.length,
    reused: false,
    notes
  };
};

// ============================================================
// READ: what the live DB already holds
// ============================================================

export type EventRow = {
  id: number;
  categoryId: number;
  playerId: number;
  eventable: string;
  pickable: string;
  createdAt: Date;
};

export type Pair = {
  key: string;
  playerId: number;
  categoryId: number;
  mode: string;
  events: EventRow[];
  byPickable: Map<string, EventRow[]>;
  pickables: string[];
};

export type Live = {
  games: (typeof games.$inferSelect)[];
  categories: (typeof categories.$inferSelect)[];
  players: (typeof players.$inferSelect)[];
  pairs: Pair[];
  events: number;
  truncated: boolean;
};

/**
 * The timestamp round-trip is load-bearing here — every backdated draft is derived from an event read out of
 * this same connection — and it is symmetric, but not for an obvious reason. These columns carry no zone, and
 * a plain `pg.Client` parses them in the machine's *local* zone while drizzle writes them back as UTC, which
 * on a non-UTC host would slide every pick away from the events it was placed to catch. drizzle's own session
 * (node_modules/drizzle-orm/node-postgres/session.js) pre-empts that: it overrides the TIMESTAMP parser to
 * pass the raw string through and reads it as `+0000`, so both directions agree. Verified on a +03:00 host.
 */
export const connect = (url: string): Db => drizzle(url);

/**
 * Seeded identities carry the tag as their `platform`, and (platform, platformId) is unique — so a second run
 * with the same tag and the same SEED_RNG would blow up mid-transaction. Check first, fail with instructions.
 */
export const countSeeded = async (db: Db, cfg: Config) => {
  const [row] = await db
    .select({ total: sql<number>`COUNT(*)::int` })
    .from(identities)
    .where(eq(identities.platform, cfg.tag));
  return row?.total ?? 0;
};

export const readLive = async (db: Db, cfg: Config): Promise<Live> => {
  const gameRows = await db
    .select()
    .from(games)
    .where(cfg.gameCode ? eq(games.code, cfg.gameCode) : undefined);
  if (!gameRows.length) throw new Error(`No games found${cfg.gameCode ? ` for code "${cfg.gameCode}"` : ''}.`);

  const categoryRows = await db
    .select()
    .from(categories)
    .where(
      inArray(
        categories.gameId,
        gameRows.map(g => g.id)
      )
    );
  if (!categoryRows.length) throw new Error('No categories found — the live DB has no game modes to seed against.');

  const eventRows = await db
    .select({
      id: events.id,
      categoryId: events.categoryId,
      playerId: events.playerId,
      eventable: events.eventable,
      pickable: events.pickable,
      createdAt: events.createdAt
    })
    .from(events)
    .where(
      and(
        inArray(
          events.categoryId,
          categoryRows.map(c => c.id)
        ),
        cfg.playerIds.length ? inArray(events.playerId, cfg.playerIds) : undefined
      )
    )
    .orderBy(desc(events.createdAt))
    .limit(cfg.eventLimit);

  if (!eventRows.length)
    throw new Error(
      'No player events found. Scored drafts are derived from real events, so the live DB needs player activity first.'
    );

  const modes = new Map(categoryRows.map(c => [c.id, c.mode] as const));
  const grouped = new Map<string, EventRow[]>();
  for (const row of eventRows) {
    const key = `${row.playerId}:${row.categoryId}`;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(row);
    else grouped.set(key, [row]);
  }

  const pairs = [...grouped].map(([key, rows]) => {
    // rows arrive newest-first; keep the newest slice, then flip to oldest-first for timeline work.
    const kept = rows.slice(0, cfg.pairEvents).reverse();
    const byPickable = new Map<string, EventRow[]>();
    for (const row of kept) {
      const bucket = byPickable.get(row.pickable);
      if (bucket) bucket.push(row);
      else byPickable.set(row.pickable, [row]);
    }
    const [playerId, categoryId] = key.split(':').map(Number);
    return {
      key,
      playerId,
      categoryId,
      mode: modes.get(categoryId) ?? String(categoryId),
      events: kept,
      byPickable,
      pickables: [...byPickable.keys()]
    };
  });

  const playerRows = await db
    .select()
    .from(players)
    .where(
      inArray(
        players.id,
        pairs.map(p => p.playerId)
      )
    );

  return {
    games: gameRows,
    categories: categoryRows,
    players: playerRows,
    pairs,
    events: eventRows.length,
    truncated: eventRows.length === cfg.eventLimit
  };
};

// ============================================================
// PLAN: pure, so a dry run tells the truth about a real run
// ============================================================

export type PlannedViewer = { index: number; username: string; platformId: string; avatar: string; profile: Profile };
export type PlannedPick = { pickable: string; matches: number[] };
export type PlannedDraft = {
  viewer: number;
  playerId: number;
  categoryId: number;
  createdAt: Date;
  picks: PlannedPick[];
};
export type PlannedPickaroo = {
  index: number;
  playerId: number;
  categoryId: number;
  eventable: string;
  pickables: string[];
  outcomeId: number | null;
  winner: string | null;
  createdAt: Date;
};
export type PlannedPickem = { viewer: number; pickaroo: number; pickable: string; hit: boolean; createdAt: Date };
export type PlannedObserver = { viewer: number; eventId: number; categoryId: number; createdAt: Date };
/** `id` is a negative placeholder until writeSeed inserts the row and swaps in the real one. */
export type PlannedEvent = EventRow & { mode: string; donor: string };

export type Forecast = {
  viewer: number;
  username: string;
  profile: string;
  categoryId: number;
  drafts: number;
  picks: number;
  observedPicks: number;
  notObservedEvents: number;
  unpicked: number;
  attempts: number;
  hits: number;
  misses: number;
  engagement: number;
  pickems: number;
  weighted: number;
};

export type Plan = {
  viewers: PlannedViewer[];
  events: PlannedEvent[];
  drafts: PlannedDraft[];
  observers: PlannedObserver[];
  pickaroos: PlannedPickaroo[];
  pickems: PlannedPickem[];
  forecast: Forecast[];
  notes: string[];
};

const hours = (n: number) => n * 60 * 60 * 1000;

/**
 * A pick only scores when an event with the same pickable lands at or after the pick
 * (`e.createdAt >= pick.createdAt` in summary.fantasy), so drafts are backdated ahead of the events they are
 * meant to catch. The lead clamp keeps them out of the 12h "you can draft again" window in ebs.draft too.
 *
 * The floor matters just as much: a draft never predates the pair's oldest *loaded* event, so no event outside
 * the loaded window can quietly match a pick and make the forecast lie about what scored.
 */
const draftedAt = (pair: Pair, profile: Profile, nth: number, rand: Rando, leadHours: number) => {
  const oldest = pair.events[0].createdAt.getTime();
  const newest = pair.events[pair.events.length - 1].createdAt.getTime();
  const lead = newest - hours(leadHours);
  const fraction = Math.min(0.85, Math.max(0, profile.cut + nth * 0.15 + rand.next() * 0.1));
  const cut = pair.events[Math.min(pair.events.length - 1, Math.floor(pair.events.length * fraction))];
  return new Date(Math.max(oldest, Math.min(cut.createdAt.getTime() - 60_000, lead)));
};

/**
 * A mode holding zero events can hold no scored drafts either, so it gets synthetic events modelled on a
 * donor mode of the same family: that mode's real pickables and eventables, spread across the recent past.
 * Modes that already have live events are left alone — this only ever fills a genuine void.
 */
const bootstrapPairs = (live: Live, cfg: Config, rand: Rando, notes: string[]) => {
  const events: PlannedEvent[] = [];
  const pairs: Pair[] = [];
  if (cfg.bootstrap === 'off' || !live.pairs.length) return { events, pairs };

  const covered = new Set(live.pairs.map(p => p.categoryId));
  const wanted = live.categories.filter(
    category =>
      !covered.has(category.id) && (cfg.bootstrap === 'auto' || (cfg.bootstrap as string[]).includes(category.mode))
  );
  for (const mode of cfg.bootstrap === 'auto' ? [] : (cfg.bootstrap as string[]))
    if (live.categories.some(c => c.mode === mode && covered.has(c.id)))
      notes.push(`${mode} already has live events — left as it is rather than topped up with synthetic ones.`);

  // Anchor to the newest real event so synthetic history lands in DB time, never in this machine's clock.
  const anchor = live.pairs.reduce(
    (newest, pair) => Math.max(newest, pair.events[pair.events.length - 1].createdAt.getTime()),
    0
  );
  const span = cfg.bootstrapDays * 24 * 60 * 60 * 1000;
  let placeholder = 0;

  for (const category of wanted) {
    const sameFamily = live.pairs.filter(p => family(p.mode) === family(category.mode));
    const donors = sameFamily.length ? sameFamily : live.pairs;
    if (!sameFamily.length)
      notes.push(`${category.mode} has no same-family donor — borrowing from ${donors[0].mode}, which plays differently.`);
    const donor = donors.reduce((best, pair) => (pair.events.length > best.events.length ? pair : best));
    const eventables = [...new Set(donor.events.map(e => e.eventable))];

    const made: EventRow[] = [];
    for (let i = 0; i < cfg.bootstrapEvents; i++) {
      const at = anchor - span + Math.floor(((i + rand.next()) / cfg.bootstrapEvents) * span);
      made.push({
        id: --placeholder,
        categoryId: category.id,
        playerId: donor.playerId,
        eventable: rand.choice(eventables),
        pickable: rand.choice(donor.pickables),
        createdAt: new Date(at)
      });
    }
    made.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const byPickable = new Map<string, EventRow[]>();
    for (const row of made) {
      const bucket = byPickable.get(row.pickable);
      if (bucket) bucket.push(row);
      else byPickable.set(row.pickable, [row]);
    }

    events.push(...made.map(e => ({ ...e, mode: category.mode, donor: donor.mode })));
    pairs.push({
      key: `${donor.playerId}:${category.id}`,
      playerId: donor.playerId,
      categoryId: category.id,
      mode: category.mode,
      events: made,
      byPickable,
      pickables: [...byPickable.keys()]
    });
    notes.push(`${category.mode} held no events — bootstrapped ${made.length} from ${donor.mode}'s pickables.`);
  }

  return { events, pairs };
};

export const planSeed = (live: Live, cfg: Config): Plan => {
  const rand = rando(cfg.rng);
  const notes: string[] = [];
  const names = funkyNames(cfg.viewers, rand);
  const boot = bootstrapPairs(live, cfg, rand, notes);
  const allPairs = [...live.pairs, ...boot.pairs];

  const plan: Plan = {
    viewers: names.map((username, index) => ({
      index,
      username,
      platformId: `${username.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${index + 1}`,
      avatar: AVATARS[index % AVATARS.length],
      profile: profiles[index % profiles.length]
    })),
    events: boot.events,
    drafts: [],
    observers: [],
    pickaroos: [],
    pickems: [],
    forecast: [],
    notes
  };

  // ── pickaroos hang off the player, not the viewer, so they are planned once per pair ──────────────────
  const pickaroosByPair = new Map<string, number[]>();
  for (const pair of allPairs) {
    const mine: number[] = [];
    if (pair.pickables.length < 2)
      notes.push(`pair ${pair.key} (${pair.mode}) has a single pickable — its pickems can only hit.`);

    // Distinct outcome events, so two pickaroos never resolve to the same moment.
    for (const outcome of rand.sample(pair.events, cfg.resolvedPickaroos)) {
      const decoys = rand.sample(
        pair.pickables.filter(p => p !== outcome.pickable),
        cfg.options - 1
      );
      mine.push(plan.pickaroos.length);
      plan.pickaroos.push({
        index: plan.pickaroos.length,
        playerId: pair.playerId,
        categoryId: pair.categoryId,
        eventable: outcome.eventable,
        pickables: rand.shuffle([outcome.pickable, ...decoys]),
        outcomeId: outcome.id,
        winner: outcome.pickable,
        createdAt: new Date(outcome.createdAt.getTime() - 5 * 60_000)
      });
    }

    // Still-open ones give the live UI something to actually vote on. They score nothing until resolved, and
    // (category, player, eventable) is unique while open — so each one takes a different eventable.
    const newest = pair.events[pair.events.length - 1].createdAt;
    const eventables = [...new Set(pair.events.map(e => e.eventable))];
    for (const eventable of rand.sample(eventables, cfg.openPickaroos)) {
      plan.pickaroos.push({
        index: plan.pickaroos.length,
        playerId: pair.playerId,
        categoryId: pair.categoryId,
        eventable,
        pickables: rand.sample(pair.pickables, cfg.options),
        outcomeId: null,
        winner: null,
        createdAt: newest
      });
    }
    pickaroosByPair.set(pair.key, mine);
  }

  // ── viewers: drafts + picks + observations + pickems ──────────────────────────────────────────────────
  for (const viewer of plan.viewers) {
    const { profile } = viewer;
    const engaged = rand.sample(allPairs, Math.max(1, Math.min(cfg.pairsPerViewer, allPairs.length)));
    const observed = new Set<number>();

    for (const pair of engaged) {
      for (let d = 0; d < cfg.draftsPerViewer; d++) {
        const createdAt = draftedAt(pair, profile, d, rand, cfg.leadHours);
        const matchable = pair.events.filter(e => e.createdAt >= createdAt);
        const hitPool = [...new Set(matchable.map(e => e.pickable))];
        const missPool = pair.pickables.filter(p => !hitPool.includes(p));

        const chosen = new Set<string>();
        for (let attempt = 0; chosen.size < cfg.picksPerDraft && attempt < cfg.picksPerDraft * 8; attempt++) {
          const wantsHit = rand.chance(profile.pickAccuracy);
          const pool = (wantsHit ? hitPool : missPool).filter(p => !chosen.has(p));
          const fallback = (wantsHit ? missPool : hitPool).filter(p => !chosen.has(p));
          const source = pool.length ? pool : fallback;
          if (!source.length) break;
          chosen.add(rand.choice(source));
        }

        plan.drafts.push({
          viewer: viewer.index,
          playerId: pair.playerId,
          categoryId: pair.categoryId,
          createdAt,
          picks: [...chosen].map(pickable => ({
            pickable,
            matches: (pair.byPickable.get(pickable) ?? []).filter(e => e.createdAt >= createdAt).map(e => e.id)
          }))
        });
      }

      // Observations stay inside engaged pairs so the forecast matches what summary.scores will bucket.
      for (const event of pair.events) {
        if (!observed.has(event.id) && rand.chance(profile.observeRate)) {
          observed.add(event.id);
          plan.observers.push({
            viewer: viewer.index,
            eventId: event.id,
            categoryId: pair.categoryId,
            createdAt: event.createdAt
          });
        }
      }

      for (const index of pickaroosByPair.get(pair.key) ?? []) {
        if (!rand.chance(profile.pickemRate)) continue;
        const pickaroo = plan.pickaroos[index];
        const decoys = pickaroo.pickables.filter(p => p !== pickaroo.winner);
        const hit = rand.chance(profile.pickemAccuracy) || !decoys.length;
        plan.pickems.push({
          viewer: viewer.index,
          pickaroo: index,
          pickable: hit ? pickaroo.winner! : rand.choice(decoys),
          hit,
          createdAt: new Date(pickaroo.createdAt.getTime() + 60_000)
        });
      }
    }
  }

  plan.forecast = forecast(plan);
  return plan;
};

/**
 * Replays the arithmetic in summary.scores + the weighting in ebs.game, so the printed leaderboard is what
 * the app should show once this data lands.
 */
export const forecast = (plan: Plan): Forecast[] => {
  type Bucket = Omit<Forecast, 'engagement' | 'pickems' | 'weighted'> & {
    matched: Set<number>;
    observedMatched: Set<number>;
  };
  const buckets = new Map<string, Bucket>();
  const observedBy = new Map<number, Set<number>>();
  for (const o of plan.observers) {
    const set = observedBy.get(o.viewer) ?? new Set<number>();
    set.add(o.eventId);
    observedBy.set(o.viewer, set);
  }

  const bucket = (viewer: number, categoryId: number) => {
    const key = `${viewer}:${categoryId}`;
    const found = buckets.get(key);
    if (found) return found;
    const made: Bucket = {
      viewer,
      username: plan.viewers[viewer].username,
      profile: plan.viewers[viewer].profile.type,
      categoryId,
      drafts: 0,
      picks: 0,
      observedPicks: 0,
      notObservedEvents: 0,
      unpicked: 0,
      attempts: 0,
      hits: 0,
      misses: 0,
      matched: new Set<number>(),
      observedMatched: new Set<number>()
    };
    buckets.set(key, made);
    return made;
  };

  for (const draft of plan.drafts) {
    const b = bucket(draft.viewer, draft.categoryId);
    const seen = observedBy.get(draft.viewer) ?? new Set<number>();
    b.drafts += 1;
    b.picks += draft.picks.length;
    for (const pick of draft.picks) {
      let touched = false;
      for (const id of pick.matches) {
        b.matched.add(id);
        if (seen.has(id)) {
          b.observedMatched.add(id);
          touched = true;
        }
      }
      if (touched) b.observedPicks += 1;
    }
  }

  for (const o of plan.observers) {
    const b = buckets.get(`${o.viewer}:${o.categoryId}`);
    if (b && !b.matched.has(o.eventId)) b.unpicked += 1;
  }

  for (const pickem of plan.pickems) {
    const pickaroo = plan.pickaroos[pickem.pickaroo];
    const b = bucket(pickem.viewer, pickaroo.categoryId);
    b.attempts += 1;
    if (pickem.hit) b.hits += 1;
    else b.misses += 1;
  }

  return [...buckets.values()]
    .map(({ matched, observedMatched, ...b }) => {
      b.notObservedEvents = matched.size - observedMatched.size;
      const engagement = Math.round(
        b.observedPicks * weights.observed + b.notObservedEvents * weights.picked + b.unpicked * weights.unpicked
      );
      // The misses term is the app's own formula (ebs.game), quirk included — mirrored, not corrected.
      const pickemScore = Math.round(b.hits * weights.win + (b.attempts * b.misses) / weights.lose);
      return { ...b, engagement, pickems: pickemScore, weighted: engagement + pickemScore };
    })
    .sort((a, b) => b.weighted - a.weighted);
};

// ============================================================
// WRITE
// ============================================================

export type Written = {
  users: number;
  viewers: number;
  events: number;
  drafts: number;
  picks: number;
  observers: number;
  pickaroos: number;
  openPickaroos: number;
  pickems: number;
  viewerIds: number[];
};

const chunks = <T>(rows: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
};

/** Returned rows are matched back by their `meta.k` marker rather than by array position. */
const byMarker = (rows: { id: number; meta: unknown }[], expected: number, label: string) => {
  if (rows.length !== expected) throw new Error(`${label}: only ${rows.length}/${expected} rows came back from the insert.`);
  const ids = Array.from({ length: expected }, () => -1);
  for (const row of rows) {
    const k = (row.meta as { k?: number } | null)?.k;
    if (typeof k !== 'number') throw new Error(`${label}: inserted row ${row.id} came back without its meta.k marker.`);
    ids[k] = row.id;
  }
  const hole = ids.indexOf(-1);
  if (hole >= 0) throw new Error(`${label}: no inserted row claimed marker ${hole}.`);
  return ids;
};

export const writeSeed = async (db: Db, plan: Plan, cfg: Config): Promise<Written> =>
  db.transaction(async tx => {
    const stamp = { seed: cfg.tag };

    // `user` carries no meta to mark, but the rows are blank and interchangeable — any user per viewer will do.
    const userRows = await tx
      .insert(users)
      .values(plan.viewers.map(() => ({})))
      .returning({ id: users.id });

    const identityRows = await tx
      .insert(identities)
      .values(
        plan.viewers.map((v, k) => ({
          userId: userRows[k].id,
          platform: cfg.tag,
          platformId: v.platformId,
          meta: {
            ...stamp,
            k,
            // Shape mirrors ebs.configure's $Viewer upsert: identities.meta.viewer holds the Helix user.
            viewer: {
              id: v.platformId,
              login: v.username.toLowerCase(),
              display_name: v.username,
              profile_image_url: v.avatar,
              offline_image_url: '',
              description: `Seeded by tests/live/populate.ts (${v.profile.type})`,
              broadcaster_type: '',
              type: '',
              view_count: 0,
              created_at: new Date().toISOString()
            }
          }
        }))
      )
      .returning({ id: identities.id, meta: identities.meta });
    const identityIds = byMarker(identityRows, plan.viewers.length, 'identities');

    const viewerRows = await tx
      .insert(viewers)
      .values(
        plan.viewers.map((v, k) => ({
          identityId: identityIds[k],
          meta: { ...stamp, k, username: v.username, avatar: v.avatar, profile: v.profile.type }
        }))
      )
      .returning({ id: viewers.id, meta: viewers.meta });
    const viewerIds = byMarker(viewerRows, plan.viewers.length, 'viewers');

    // Bootstrap events go in first: observers and pickaroos below reference them by placeholder id.
    const eventRows = plan.events.length
      ? await tx
          .insert(events)
          .values(
            plan.events.map((e, k) => ({
              categoryId: e.categoryId,
              playerId: e.playerId,
              eventable: e.eventable,
              pickable: e.pickable,
              createdAt: e.createdAt,
              meta: { ...stamp, k, mode: e.mode, donor: e.donor }
            }))
          )
          .returning({ id: events.id, meta: events.meta })
      : [];
    // Keyed by placeholder id, not by position — the planner sorts events into timeline order after minting ids.
    const eventIds = byMarker(eventRows, plan.events.length, 'events');
    const realIds = new Map(plan.events.map((e, k) => [e.id, eventIds[k]] as const));
    const realEvent = (id: number) => {
      if (id >= 0) return id;
      const real = realIds.get(id);
      if (real == null) throw new Error(`no inserted event for placeholder ${id}`);
      return real;
    };

    const draftRows = await tx
      .insert(drafts)
      .values(
        plan.drafts.map((d, k) => ({
          categoryId: d.categoryId,
          playerId: d.playerId,
          viewerId: viewerIds[d.viewer],
          createdAt: d.createdAt,
          meta: { ...stamp, k }
        }))
      )
      .returning({ id: drafts.id, meta: drafts.meta });
    const draftIds = byMarker(draftRows, plan.drafts.length, 'drafts');

    const pickValues = plan.drafts.flatMap((d, k) =>
      d.picks.map(p => ({ draftId: draftIds[k], pickable: p.pickable, createdAt: d.createdAt, meta: stamp }))
    );
    for (const batch of chunks(pickValues, 2000)) await tx.insert(picks).values(batch);

    const observerValues = plan.observers.map(o => ({
      viewerId: viewerIds[o.viewer],
      eventId: realEvent(o.eventId),
      createdAt: o.createdAt,
      meta: stamp
    }));
    for (const batch of chunks(observerValues, 2000)) await tx.insert(observers).values(batch);

    const resolved = plan.pickaroos.filter(p => p.outcomeId != null);
    const open = plan.pickaroos.filter(p => p.outcomeId == null);

    const resolvedRows = await tx
      .insert(pickaroos)
      .values(
        resolved.map((p, k) => ({
          categoryId: p.categoryId,
          playerId: p.playerId,
          eventable: p.eventable,
          pickables: p.pickables,
          outcomeId: realEvent(p.outcomeId!),
          createdAt: p.createdAt,
          meta: { ...stamp, k }
        }))
      )
      .returning({ id: pickaroos.id, meta: pickaroos.meta });
    const resolvedIds = byMarker(resolvedRows, resolved.length, 'pickaroos');
    const pickarooIds = new Map(resolved.map((p, k) => [p.index, resolvedIds[k]] as const));

    // A live player may already have an open pickaroo for the same eventable — that partial unique index wins.
    const openRows = open.length
      ? await tx
          .insert(pickaroos)
          .values(
            open.map(p => ({
              categoryId: p.categoryId,
              playerId: p.playerId,
              eventable: p.eventable,
              pickables: p.pickables,
              outcomeId: null,
              createdAt: p.createdAt,
              meta: stamp
            }))
          )
          .onConflictDoNothing()
          .returning({ id: pickaroos.id })
      : [];

    const pickemValues = plan.pickems.map(p => ({
      categoryId: plan.pickaroos[p.pickaroo].categoryId,
      playerId: plan.pickaroos[p.pickaroo].playerId,
      viewerId: viewerIds[p.viewer],
      pickarooId: pickarooIds.get(p.pickaroo)!,
      pickable: p.pickable,
      createdAt: p.createdAt,
      meta: stamp
    }));
    for (const batch of chunks(pickemValues, 2000)) await tx.insert(pickems).values(batch);

    return {
      users: userRows.length,
      viewers: viewerIds.length,
      events: eventIds.length,
      drafts: draftIds.length,
      picks: pickValues.length,
      observers: observerValues.length,
      pickaroos: resolvedIds.length,
      openPickaroos: openRows.length,
      pickems: pickemValues.length,
      viewerIds
    };
  });

// ============================================================
// PURGE — seeded rows only, identified by the tag
// ============================================================

export type Purged = Record<
  'users' | 'events' | 'drafts' | 'picks' | 'observers' | 'pickaroos' | 'pickems' | 'categories' | 'games',
  number
>;

export const purgeSeed = async (db: Db, cfg: Config): Promise<Purged> => {
  const tagged = (meta: PgColumn) => sql`${meta}->>'seed' = ${cfg.tag}`;

  return db.transaction(async tx => {
    // Child rows first: most would cascade off the viewer, but tagged rows attached to anything else must go too.
    const gonePickems = await tx.delete(pickems).where(tagged(pickems.meta)).returning({ id: pickems.id });
    const goneObservers = await tx.delete(observers).where(tagged(observers.meta)).returning({ id: observers.id });
    const gonePicks = await tx.delete(picks).where(tagged(picks.meta)).returning({ id: picks.id });
    const goneDrafts = await tx.delete(drafts).where(tagged(drafts.meta)).returning({ id: drafts.id });
    // Pickaroos hang off live players, so nothing cascades them — the tag is the only handle.
    const gonePickaroos = await tx.delete(pickaroos).where(tagged(pickaroos.meta)).returning({ id: pickaroos.id });
    // Bootstrap events last: anything still referencing one is itself seeded and already gone. If a real viewer
    // has interacted with a bootstrapped mode since seeding, that interaction cascades out with these rows.
    const goneEvents = await tx.delete(events).where(tagged(events.meta)).returning({ id: events.id });

    // Seeded viewers carry the tag as their platform. The local broadcaster cannot — ebs resolves it as a real
    // `twitch` identity — so it is found by the same meta.seed stamp everything else here is found by. Only this
    // populator ever writes that key, on either side.
    const seededIdentities = await tx
      .select({ userId: identities.userId })
      .from(identities)
      .where(cfg.local ? sql`${identities.platform} = ${cfg.tag} OR ${tagged(identities.meta)}` : eq(identities.platform, cfg.tag));
    const goneUsers = seededIdentities.length
      ? await tx
          .delete(users)
          .where(
            inArray(
              users.id,
              seededIdentities.map(i => i.userId)
            )
          )
          .returning({ id: users.id })
      : [];

    // Local only: the game and its modes are ours to have made, so a purge really does empty the dev DB. On a
    // live DB they are pre-existing rows this script only ever reads, and the tag can never be on them.
    const goneCategories =
      cfg.local ? await tx.delete(categories).where(tagged(categories.meta)).returning({ id: categories.id }) : [];
    const goneGames = cfg.local ? await tx.delete(games).where(tagged(games.meta)).returning({ id: games.id }) : [];

    return {
      users: goneUsers.length,
      events: goneEvents.length,
      drafts: goneDrafts.length,
      picks: gonePicks.length,
      observers: goneObservers.length,
      pickaroos: gonePickaroos.length,
      pickems: gonePickems.length,
      categories: goneCategories.length,
      games: goneGames.length
    };
  });
};

// ============================================================
// REPORT
// ============================================================

const pad = (value: unknown, width: number, left = false) => {
  const text = String(value);
  return left ? text.padStart(width) : text.padEnd(width);
};

const redact = (url: string) => url.replace(/(\/\/[^:/@]*:)[^@]*@/, '$1***@');

export const describeFoundation = (foundation: Foundation, cfg: Config) => {
  const lines = [
    `🧱 local floor  ${redact(cfg.url)}`,
    `    game        HS #${foundation.gameId} · ${foundation.categories.map(c => c.mode).join(', ')}`,
    `    broadcaster player #${foundation.playerId} · twitch:${cfg.channelId}`,
    foundation.reused ?
      '    history     already in place — nothing minted'
    : `    history     ${foundation.events} synthetic events over ${cfg.bootstrapDays} days`
  ];
  for (const note of foundation.notes) lines.push(`    · ${note}`);
  return lines.join('\n');
};

/**
 * The dev fallback in src/lib/server/auth.ts signs in as `Viewer({ id: 1 })` and resolves the broadcaster from a
 * hardcoded channel_id, so whether the seed is visible at all comes down to those two ids. Say so plainly rather
 * than leaving a dev to wonder why a freshly populated app looks empty.
 */
export const describeMock = (plan: Plan, written: Written, cfg: Config) => {
  const seat = written.viewerIds.indexOf(1);
  const viewer = seat >= 0 ? plan.viewers[seat] : undefined;
  return [
    '🖥️  npm run dev:bang  → http://localhost:5173/app/HS',
    viewer ?
      `    you are     viewer #1 "${viewer.username}" (${viewer.profile.type}) on the seeded channel`
    : `    ⚠ the dev fallback signs in as viewer #1, which is not one of the ${written.viewers} this run wrote ` +
      `(#${written.viewerIds[0]}–#${written.viewerIds[written.viewerIds.length - 1]}), so the app will look empty. ` +
      'Re-run `npm run db:populate:local`, which purges first and lets the ids restart at 1.',
    `    broadcaster twitch:${cfg.channelId}`
  ].join('\n');
};

export const describeLive = (live: Live, cfg: Config) => {
  const span = live.pairs.reduce(
    (acc, pair) => {
      for (const e of pair.events) {
        const at = e.createdAt.getTime();
        acc.min = Math.min(acc.min, at);
        acc.max = Math.max(acc.max, at);
      }
      return acc;
    },
    { min: Infinity, max: -Infinity }
  );

  const lines = [
    `${cfg.local ? '🗄️  local source' : '🛰️  live source'}  ${live.games.map(g => g.code).join(', ')} · ${live.categories.length} categories · ${live.players.length} players`,
    `    events      ${live.events}${live.truncated ? ` (capped at SEED_EVENT_LIMIT=${cfg.eventLimit})` : ''} across ${live.pairs.length} player+category pairs`,
    Number.isFinite(span.min) ?
      `    window      ${new Date(span.min).toISOString()} → ${new Date(span.max).toISOString()}`
    : '    window      —'
  ];
  for (const pair of live.pairs.slice(0, 12))
    lines.push(
      `    · player ${pad(pair.playerId, 4)} ${pad(pair.mode, 14)} ${pad(pair.events.length, 5, true)} events · ${pair.pickables.length} distinct pickables`
    );
  if (live.pairs.length > 12) lines.push(`    · …and ${live.pairs.length - 12} more pairs`);

  const covered = new Set(live.pairs.map(p => p.categoryId));
  const empty = live.categories.filter(c => !covered.has(c.id));
  if (empty.length) lines.push(`    empty modes ${empty.map(c => c.mode).join(', ')} — no live events at all`);
  return lines.join('\n');
};

export const describePlan = (plan: Plan, cfg: Config) => {
  const picks = plan.drafts.reduce((sum, d) => sum + d.picks.length, 0);
  const scoring = plan.drafts.reduce((sum, d) => sum + d.picks.filter(p => p.matches.length).length, 0);
  const hits = plan.pickems.filter(p => p.hit).length;
  const bootstrapped = [...new Set(plan.events.map(e => e.mode))];
  const lines = [
    `🎲 plan (tag "${cfg.tag}", rng "${cfg.rng}")`,
    `    viewers     ${plan.viewers.length}`,
    plan.events.length ?
      `    events      ${plan.events.length} synthetic, bootstrapping ${bootstrapped.join(', ')}`
    : '    events      none — every mode already had live activity',
    `    drafts      ${plan.drafts.length} · picks ${picks} (${scoring} already scoring, ${picks - scoring} whiffs)`,
    `    observers   ${plan.observers.length}`,
    `    pickaroos   ${plan.pickaroos.filter(p => p.outcomeId != null).length} resolved · ${plan.pickaroos.filter(p => p.outcomeId == null).length} open`,
    `    pickems     ${plan.pickems.length} (${hits} hits, ${plan.pickems.length - hits} misses)`
  ];
  for (const note of plan.notes) lines.push(`    ⚠ ${note}`);
  return lines.join('\n');
};

export const describeForecast = (plan: Plan) => {
  const head = [
    pad('viewer', 30),
    pad('profile', 9),
    pad('cat', 4, true),
    pad('drafts', 7, true),
    pad('picks', 6, true),
    pad('perfect', 8, true),
    pad('missed', 7, true),
    pad('unpick', 7, true),
    pad('hit/att', 8, true),
    pad('engage', 8, true),
    pad('pickem', 7, true),
    pad('total', 8, true)
  ].join(' ');

  const rows = plan.forecast.map(f =>
    [
      pad(f.username, 30),
      pad(f.profile, 9),
      pad(f.categoryId, 4, true),
      pad(f.drafts, 7, true),
      pad(f.picks, 6, true),
      pad(f.observedPicks, 8, true),
      pad(f.notObservedEvents, 7, true),
      pad(f.unpicked, 7, true),
      pad(`${f.hits}/${f.attempts}`, 8, true),
      pad(f.engagement, 8, true),
      pad(f.pickems, 7, true),
      pad(f.weighted, 8, true)
    ].join(' ')
  );

  return ['🏆 forecast — what the leaderboard should read once this lands', head, '─'.repeat(head.length), ...rows].join('\n');
};
