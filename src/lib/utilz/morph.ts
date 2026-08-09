export const kappa = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
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

export const identify = <T>(x: T): T => x;

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

export const timez = {
  second: (seconds = 1) => seconds * 1000,
  minute: (minutes = 1) => minutes * timez.second(60),
  hour: (hours = 1) => hours * timez.minute(60),
  day: (days = 1) => days * timez.hour(24)
} as const;

export const rando = {
  range: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
  choice: <T>(arr: T[] | readonly T[]) => arr[Math.floor(Math.random() * arr.length)]
} as const;

export const timer = (createdAt: Date, timeBetween: number) => {
  const now = new Date();
  const next = new Date(createdAt.getTime() + timeBetween);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const str = (dt: Date) => {
    const time = dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return (
      dt.toDateString() === now.toDateString() ? `today at ${time}`
      : dt.toDateString() === tomorrow.toDateString() ? `tomorrow at ${time}`
      : dt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    );
  };
  return {
    next,
    nextStr: str(next),
    str: str(createdAt)
  };
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
