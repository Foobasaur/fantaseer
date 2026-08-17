export const is = (n: number, even = true) => (even ? n % 2 === 0 : n % 2 !== 0);
export const radian = (deg: number) => deg * (Math.PI / 180);
export const degree = (rad: number) => rad * (180 / Math.PI);
export const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
export const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
export const percentage = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);
export const round = (n: number, decimals = 0) => {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
};
export const distribute = (total: number, recipients: number) => {
  const base = Math.floor(total / recipients);
  const remainder = total % recipients;
  return Array.from({ length: recipients }, (_, i) => (i < remainder ? base + 1 : base));
};
export const odds = (total: number, outcome: number) =>
  outcome === 0 ? 2.0 : Math.max(1.1, round(total / outcome, 1));

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
