import type { games, game, draft, pickaroo, configure } from '$lib/server/ebs';
export namespace Server {
  namespace Auth {
    interface IAnonymous<Meta = unknown> {
      id?: number;
      meta?: Meta;
      sessionToken?: string;
    }
    interface Identity<M> {
      id: number;
      meta: M;
      userId: string;
      platform: string;
      platformId: string;
      identityId: number;
    }
    type User<M, Jwt, Oauth> = StrictUnion<{ anonymous: IAnonymous<M> } | { authenticated: Identity<M> }> &
      StrictUnion<{ jwt: Jwt } | { oauth: Oauth }>;

    interface IAuthProvider<Meta, Jwt> {
      resolve(jwt?: string | null, mode?: string | null): Promise<toothy<User<Meta, Jwt>>>;
    }
  }

  /**
   * EBS (Extension Backend Service) Response Types
   *
   * Defines the JSON shapes returned by /api/app/ endpoints.
   * Used as generic parameters in ebs(fetch).get<T>() calls
   * within client-side load functions (+page.ts, +layout.ts).
   *
   * Each type mirrors the return value of its corresponding
   * server load function, ensuring the extension SPA receives
   * the same data shape as the SSR build.
   *
   * @module @/ebs
   */
  namespace EBS {
    // ─── /api/app ────────────────────────────────────────────────
    /** GET /api/app — game list (public, no auth) */
    type Games = Returnz<typeof games>;

    // ─── /api/app/[game]/[[mode]] ────────────────────────────────
    /** GET /api/app/:game/:mode? — game init + categories + pickables + summaries */
    type Game = Returnz<typeof game>;

    // ─── /api/app/[game]/[[mode]]/fantasy ────────────────────────
    /** GET /api/app/:game/:mode?/fantasy — drafts + events + observations */
    type Fantasy = Returnz<Returnz<typeof draft>['fantasy']>;

    // ─── /api/app/[game]/[[mode]]/fantasy/[draft] ────────────────
    /** GET /api/app/:game/:mode?/fantasy/:draft — draft entities */
    type Draft<M extends keyof Returnz<typeof draft>> = Returnz<Returnz<typeof draft>[M]>;

    /** POST /api/app/:game/:mode?/fantasy/:draft — confirm picks */
    // export type DraftConfirm = { success: true; draftId: number };

    // ─── /api/app/[game]/[[mode]]/pickaroo ────────────────────
    /** GET /api/app/:game/:mode?/pickaroo — predictions + viewer votes */
    type Predictachu<M extends keyof Returnz<typeof pickaroo> = 'get'> = Returnz<Returnz<typeof pickaroo>[M]>;

    /** POST /api/app/:game/:mode?/pickaroo — cast vote */
    // export type PredictachuVote = { success: true; vote: DB.Infertable['votes'] };

    // ─── Scores (derived from GameInit.summaries, no endpoint) ───
    /** Leaderboard entry — computed client-side from GameInit.summaries.scores */

    // ---- Configurations -──────────────────────────────────────────────
    type Configure<M extends keyof ReturnType<typeof configure> = 'get'> = Returnz<Returnz<typeof configure>[M]>;
  }
}

import type { tablez } from '$lib/server/db/client';
import type { InferSelectViewModel, SQL } from 'drizzle-orm';
import type { PgColumn, AnyPgColumn } from 'drizzle-orm/pg-core';
export namespace DB {
  // ============================================
  // Tables
  // ============================================

  export type Tables = typeof tablez;
  export type Tablekey = keyof Tables;
  export type Infertable<K extends 'Select' | 'Insert' = 'Select'> = {
    [O in Tablekey]: Tables[O][`$infer${K}`];
  };
  export type Metabled<T extends Tablekey, meta extends unknown> = R3place<Infertable[T], 'meta', meta | undefined | null>;
  type Viewer<T = never> = Metabled<
    'viewers',
    { username?: string; avatar?: string } & ([T] extends [never] ? {} : { [K in keyof T]?: T[K] })
  >;
  // ============================================
  // Utility Types
  // ============================================
  export type Colmnuilder = PgColumn | SQL | SQL.Aliased | AnyPgColumn;

  // Map selected columns to their types
  export type Selectuilder<S> = {
    [K in keyof S]: S[K] extends Colmnuilder<infer U> ? U : unknown;
  };

  // Column condition - all possible ways to filter a column
  export type ColumnCondition<T> =
    | T // Exact value (defaults to eq)
    | ['isNull' | 'isNotNull'] // Unary: [isNull] or [isNotNull]
    | ['between' | 'notBetween', T, T] // Range: [between, min, max]
    | ['eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte', T] // Binary: [eq, value], [gt, value], etc.
    | ['like' | 'notLike' | 'ilike' | 'notIlike', string] // Pattern: [like, '%foo%']
    | ['inArray' | 'notInArray' | 'arrayContains' | 'arrayContained' | 'arrayOverlaps', T[]]; // Array: [inArray, [1, 2, 3]]
  export type Options<K extends Tablekey> = {
    where?: {
      [O in keyof Infertable[K]]?: ColumnCondition<Infertable[K][O]>;
    };
  } & {
    select?: { [key: string]: Colmnuilder };
    operato?: 'and' | 'or';
    orderBy?: keyof Infertable[K] | Colmnuilder[];
    groupBy?: keyof Infertable[K] | Colmnuilder[];
    limit?: number;
    offset?: number;
  };

  // ============================================================================
  // EVENT TYPES
  // ============================================================================
  export type EventAction = 'created' | 'updated' | 'deleted';

  /**
   * Payload varies by action
   */
  export type EventPayload<T extends Tablekey, A extends EventAction, meta> =
    A extends 'deleted' ? { id: number | string } : Metabled<T, meta>;

  /**
   * Generate events with correct payloads
   * @template O - Table key
   * @template T - If true, wraps payload in tuple for EventEmitter compatibility
   */
  export type TEvent<O extends Tablekey, meta = unknown> = {
    [K in EventAction as `${O}:${K}`]: EventPayload<O, K, meta>;
  };
  export type TEventKey<K extends Tablekey> = keyof TEvent<K>;

  /**
   * Create a combined event map from multiple table keys
   * Uses distributive conditional to properly expand the union
   */
  type TMultiEvent<T extends Tablekey, meta = unknown> = UnionToIntersection<T extends any ? TEvent<T, meta> : never>;

  /**
   * Discriminated union: each entry correlates event key with its payload type
   * */
  type FeedEntry<O extends Tablekey> = {
    [K in keyof TMultiEvent<O>]: {
      event: K;
      values?: TMultiEvent<O>[K];
      payload?: any; // For compatibility with generic event handlers; can be typed more strictly if needed
    };
  }[keyof TMultiEvent<O>];

  /** Extract table name from an event key like 'picks:created'
  type TableFromKey<K extends string> = K extends `${infer T}:${EventAction}` ? T : never;*/
  /** Extract all table keys from an event map type
  type TablesOf<T> = TableFromKey<Extract<keyof T, string>>; */
}
