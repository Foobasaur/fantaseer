/**
 * Abstract base for game modules.
 *
 * TEntity = The CDN JSON type (Card, Champion, Hero)
 * TId = The lookup key type (string | number)
 *
 * Games implement this directly with their CDN types.
 * No transformation layer - CDN JSON IS the entity type.
 */
import type { CODES } from '@';
export namespace Game {
  // Game codes
  type Code = (typeof CODES)[number];

  // Game module contract for all games.
  interface Game<G extends Code> {
    readonly code: G;
    readonly name: string;
  }

  // Game module contract for draft rules and pickaroo templates.
  interface Feature<TEntity, Tmodes extends string> {
    readonly modes: Tmodes[];
    display(entity: TEntity): string;
  }

  interface Metric {
    label: string;
    weight: number;
    description?: string;
  }

  /**
   * Draft rules contract.
   * TEntity = CDN JSON type (not a platform abstraction)
   */
  type Fantasy<TEntity, Tmodes extends string, TFilter> = Feature<TEntity, Tmodes> & {
    readonly length: number;

    check: (filter: TFilter, entity: TEntity) => boolean[];
    draftables(sets?: string[]): kvp<strumbol, strumbol>[];
    canAdd(current: TEntity[], candidate: TEntity): boolean;
    validate(picks: TEntity[]): { valid: boolean; errors: string[] };
  };

  // Prediction templates (for pickaroo feature)
  type Pickaroo<TEntity, Tmodes extends string> = Feature<TEntity, Tmodes> & {
    readonly describe: string;
  };

  /**
   * Game module SERVER contract.
   */
  interface Server<G extends Code, out T, in Tmodes extends readonly string[] = string[]> extends Game<G> {
    scores: {
      ew: Record<'observed' | 'picked' | 'unpicked', Metric>; // Engagement Weights
      pw: Record<'win' | 'lose', Metric>; // Pickaroo Weights
    };

    // Lifecycle
    readonly initialized: Promise<boolean | void>;
    init(): Promise<this>;

    // Data access and mapping
    draftables: (mode?: Tmodes[number]) => string[];
    pickables: (mode?: Tmodes[number]) => T[];
    toPickable: {
      (entity: T): string;
      (entity: T[]): string[];
    };
    fromPickable: {
      (idbi: string): T | undefined;
      (idbi: string[]): T[];
    };
  }

  /**
   * Game module CLIENT contract.
   */
  interface Client<G extends Code> extends Game<G> {
    // TODO?:
    // readonly Draft: Component<{ data: FantasyDraftPageData }>;
    // readonly Picks: Component<{ picks: FantasyDraftPageData['draft']['pickedables'] }>;
    // =====================================================================================

    scoreables: (eventables: string) => [string, string] | null | undefined;
    scored<T extends { eventable: string }>(items: T[]): (T & { scoreable: { title: string; icon: string } })[];
  }
}
