/**
 * Abstract base for game modules.
 *
 * TEntity = The CDN JSON type (Card, Champion, Hero)
 * TId = The lookup key type (string | number)
 */

export namespace Game {
  const CODES = ['HS'] as const; // add more as needed ie: 'LOL', 'DOTA', Slay the Spire, etc
  type Code = (typeof CODES)[number]; // Game codes

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
    readonly weight: number;
    label: string;
    description: string;
  }

  interface Filter {
    search: string;
  }

  /** Draft rules contract. */
  interface Fantasy<TEntity, Tmodes extends string, TFilter extends Filter> extends Feature<TEntity, Tmodes> {
    readonly length: number; // Number of picks per draft

    check: (filter: TFilter, entity: TEntity) => boolean[];
    canAdd(current: TEntity[], candidate: TEntity): boolean;
    validate(picks: TEntity[]): { valid: boolean; errors: string[] };
  }

  /** Pickems rules contract. */
  interface Pickaroo<TEntity, Tmodes extends string> extends Feature<TEntity, Tmodes> {
    readonly describe: string;
  }

  /** Scores rules contract. */
  interface Scores<M = Metric> {
    ew: Record<'observed' | 'matched', M>; // Engagement Weights
    pw: Record<'win' | 'lose', M>; // Pickaroo Weights
  }

  /** Game module SERVER contract. */
  interface Server<G extends Code, out T, in Tmodes extends readonly string[] = string[]> extends Game<G> {
    readonly scores: Scores;

    // Lifecycle
    loaded?: boolean;
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

  /** Game module CLIENT contract.  */
  interface Client<G extends Code> extends Game<G> {
    // TODO?:
    // readonly Draft: Component<{ data: FantasyDraftPageData }>;
    // readonly Picks: Component<{ picks: FantasyDraftPageData['draft']['pickedables'] }>;
    // =====================================================================================

    scoreables: (eventables: string) => [string, string] | null | undefined;
    scored<T extends { eventable: string }>(items: T[]): (T & { scoreable: { title: string; icon: string } })[];
  }
}
