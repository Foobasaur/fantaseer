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
