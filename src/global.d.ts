type nullable<T> = T | null | undefined;
type toothy<T> = T | false | '' | 0 | null | void | undefined;
type strumbol = string | number | symbol;
type kvp<O = strumbol, K = strumbol> = readonly [O, K];

/**
 * Utility types for type transformations such as:
 * - R3place: Replace specific keys in a type with a new type.
 * - Replace: Similar to Replace but allows for multiple keys and preserves other keys.
 * - Rixclude: Exclude specific keys from a type and replace them with a new type.
 */
type R3place<U, T extends keyof U, I> = Omit<U, T> & { [P in T]: I };
type Rixclude<U, T extends keyof U, I> = Pick<U, Exclude<keyof U, T>> & { [P in T]: I };
type Replace<U, T extends keyof U | string, I> = { [P in keyof U]: P extends T ? I : U[P] };

/**
 * type A = { x: number } & { y: string };
 * type B = { z: boolean };
 *
 * Simplify<A | B> → maps over keyof (A | B) → only COMMON keys → {}
 * (A and B share no keys)
 *
 * Expand<A | B> → Expand<A> | Expand<B> → { x: number; y: string } | { z: boolean }
 * Each branch flattened separately, all keys preserved
 */
type Simplify<T> = { [K in keyof T]: T[K] } & {};
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// state machine type
type State<T extends string, D = {}> = { state: T; data: D };

// Utility to wrap all values in tuples
type Toopple<T extends Record<string, unknown>> = { [K in keyof T]: [T[K]] };

// Helper: Convert union to intersection
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type StrictUnion<T, K extends AllKeys<T> = AllKeys<T>> =
  T extends unknown ? T & { [P in Exclude<K, keyof T>]?: never } : never;

type AllKeys<T> = T extends unknown ? keyof T : never;

// Helper: Extract the return type of a function, unwrapping Promises
type Returnz<T> = Awaited<ReturnType<T>>;

// Helper: Make all properties of an object optional or required based on a condition
type Require<T, K extends keyof T> = Omit<Partial<T>, K> & Required<Pick<T, K>>;

// Helper: XOR type - either A or B, but not both
type XOR<A, B> = (A & { [K in keyof B]?: never }) | (B & { [K in keyof A]?: never });

//
type Emoji =
  /** grinning face */
  | '😀'
  /** hatching chick */
  | '🐣'
  /** video game controller */
  | '🎮'
  /** joystick */
  | '🕹️'
  /** slot machine */
  | '🎰'
  /** game die */
  | '🎲'
  /** crystal ball */
  | '🔮'
  /** magic wand */
  | '🪄'
  /** nazar amulet (evil eye) */
  | '🧿'
  /** nesting dolls (matryoshka) */
  | '🪆'
  /** gear / settings */
  | '⚙️'
  /** milky way / galaxy */
  | '🌌'
  /** chequered flag (finish line) */
  | '🏁'
  /** boxing glove */
  | '🥊'
  /** flying disc / frisbee */
  | '🥏'
  /** jigsaw puzzle piece */
  | '🧩'
  /** disco ball */
  | '🪩'
  /** piñata */
  | '🪅'
  /** yo-yo */
  | '🪀'
  /** chess pawn */
  | '♟️'
  /** mouse trap */
  | '🪤'
  /** full moon with face */
  | '🌝'
  /** shooting star */
  | '🌠'
  /** glowing star */
  | '🌟'
  /** star */
  | '⭐'
  /** cyclone / spiral */
  | '🌀'
  /** wind blowing */
  | '🌬️'
  /** snowflake */
  | '❄️'
  /** water wave */
  | '🌊'
  /** droplet */
  | '💧'
  /** dizzy / star spin */
  | '💫'
  /** infinity */
  | '♾️'
  /** medical symbol */
  | '⚕️'
  /** cross mark */
  | '❌'
  /** name badge */
  | '📛'
  /** no entry */
  | '⛔'
  /** hollow red circle */
  | '⭕'
  /** prohibited */
  | '🚫'
  /** trident emblem */
  | '🔱'
  /** fleur-de-lis */
  | '⚜️'
  /** radioactive */
  | '☢️'
  /** biohazard */
  | '☣️'
  /** warning */
  | '⚠️'
  /** globe with meridians */
  | '🌐'
  /** registered trademark */
  | '®️'
  /** trademark */
  | '™️'
  /** check mark */
  | '✔️'
  /** check mark button (green) */
  | '✅'
  /** night sky over city */
  | '🌃'
  /** woman mage */
  | '🧙‍♀️'
  /** man mage */
  | '🧙‍♂️'
  /** mage (gender-neutral) */
  | '🧙'
  /** flower playing cards (hanafuda) */
  | '🎴'
  /** crossed swords */
  | '⚔️'
  /** poké ball (red circle) */
  | '🔴'
  /** backpack */
  | '🎒'
  /** alien monster (battles, retro game) */
  | '👾'
  /** eye in speech bubble (viewed, witnessed) */
  | '👁️‍🗨️'
  /** memo / writing (drafts, notes) */
  | '📝'
  /** direct hit / bullseye (picks, target) */
  | '🎯'
  /** fire (plays, hot, trending) */
  | '🔥'
  | '🎓'
  | (string & {}); // ← keeps autocomplete AND allows any string
