export const Arrg = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);

export const PREFIXER = '__Any__' as const;
export const strumbolize = <T extends object>(key: string, source: T): kvp<keyof T | typeof PREFIXER, string>[] => [
  [PREFIXER, `Any ${key}`],
  ...Object.entries(source)
    .filter(([k, v]) => isNaN(Number(k)) && v !== '')
    .map(([k, v]): kvp<keyof T, string> => [k as keyof T, String(v ?? k)])
];
export const checker = <T>(eq1: T | T[], eq2: T | T[], prefix = PREFIXER) => {
  if (String(eq1).startsWith(prefix) || Object.is(eq1, eq2)) return true;
  const set = new Set<T>(Arrg(eq1));
  return Arrg(eq2).some(e => set.has(e));
};

export const prettify = (key: string, MINOR = new Set(['a', 'an', 'and', 'at', 'in', 'of', 'on', 'or', 'the', 'to', 'vs'])) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w, i) => (i && MINOR.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');

export const collect = <E, K extends string, V>(pool: E[], of: (entity: E) => Record<K, V>) => {
  const acc: Partial<Record<K, Set<V>>> = {};
  for (const card of pool)
    for (const [key, value] of Object.entries(of(card)) as [K, V][]) {
      const bucket = (acc[key] ??= new Set());
      for (const v of Arrg(value)) if (v != null) bucket.add(v);
    }
  return acc;
};

export const defs = <T>(
  label: string,
  values: Iterable<T> = [],
  name: (key: string) => string = prettify,
  sort: null | ((a: [T, T], b: [T, T]) => number) = ([, la], [, lb]) => String(la).localeCompare(String(lb))
) => {
  const named = [...values].map(value => (v => [v, name(v) || prettify(v)])(String(value)) as [T, T]);
  return {
    [PREFIXER]: `Any ${label}`,
    ...Object.fromEntries(sort ? named.sort(sort) : named)
  };
};

export const drawable = (imgs: Record<string, string>, group: Record<string, string>) => ({
  imgs,
  collection: Object.keys(group).filter(key => imgs[key.toLowerCase()])
});

export const blobby = (o: object) => {
  const imgs = Object.entries(o).reduce(
    (acc, [path, module]) => {
      const key = path.split('/').pop()?.split('.').shift()?.toLowerCase();
      if (key) acc[key] = module.default;
      return acc;
    },
    {} as Record<string, string>
  );
  return imgs;
};

export const sumScalars = <T extends Record<string, unknown>>(acc: T, src: Partial<T>) => {
  for (const [key, value] of Object.entries(src)) {
    if (!(key in acc)) continue;
    if (typeof value === 'number') {
      const target = acc as Record<string, number>;
      target[key] = (target[key] ?? 0) + value;
    } else if (Array.isArray(value)) {
      const arr = acc as Record<string, Record<string, unknown>[]>;
      arr[key] ??= [];
      for (const entry of value as Record<string, unknown>[]) {
        const identity = Object.entries(entry).filter(([, v]) => typeof v !== 'number');
        const existing = arr[key].find(e => identity.every(([k, v]) => e[k] === v));
        if (existing) sumScalars(existing, entry);
        else arr[key].push({ ...entry });
      }
    } else if (value !== null && typeof value === 'object') {
      const nested = acc as Record<string, Record<string, unknown>>;
      nested[key] ??= {};
      sumScalars(nested[key], value as Record<string, unknown>);
    }
  }
  return acc;
};

export const zipLeaves = <
  A extends { [G in keyof A]: Record<keyof A[G], object> },
  B extends { [G in keyof A]: Record<keyof A[G], object> }
>(
  a: A,
  b: B
): { [G in keyof A]: { [K in keyof A[G]]: A[G][K] & B[G][K & keyof B[G]] } } => {
  const aa = a as unknown as Record<string, Record<string, object>>;
  const bb = b as unknown as Record<string, Record<string, object>>;
  return Object.fromEntries(
    Object.entries(aa).map(([g, group]) => [
      g,
      Object.fromEntries(Object.entries(group).map(([k, v]) => [k, { ...v, ...bb[g]?.[k] }]))
    ])
  ) as never;
};

/**
 * Checks if the specified key exists in the object and is not null or undefined.
 * ```ts
 * null    != null   // false
 * undefined != null // false  ← the magic
 * 0       != null   // true
 * ''      != null   // true
 * false   != null   // true
 * NaN     != null   // true
 * obj[key] !== null      // lets undefined through ❌
 * obj[key] !== undefined // lets null through ❌
 * obj[key] != null       // catches both ✓
 * ```
 */
export const has =
  <T, K extends keyof T>(key: K) =>
  (obj: T): obj is T & { [P in K]-?: NonNullable<T[K]> } =>
    obj[key] != null;
export const hasnot =
  <T, K extends keyof T>(key: K) =>
  (obj: T): obj is T & { [P in K]: Extract<T[K], null | undefined> } =>
    obj[key] == null;
