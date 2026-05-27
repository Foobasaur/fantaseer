import { isHttpError, json, error } from '@sveltejs/kit';

export const delay = <T>(ms: number, then?: () => T) => new Promise(resolve => setTimeout(() => resolve(then?.()), ms));

export const withTimeout = async <T extends readonly unknown[] | []>(
  promises: { [K in keyof T]: Promise<T[K]> },
  timeout = 3000,
  error = new Error('timed out')
) => {
  const combined = Promise.all(promises).catch(err => {
    console.warn(err);
    throw err;
  });
  return Promise.race([combined, new Promise<never>((_, reject) => setTimeout(() => reject(error), timeout))]) as Promise<T>;
};
export const waitFor = async (conition: () => boolean, { timeout = 10, step = 100 } = {}) => {
  while (!conition()) {
    await delay(step);
    if (timeout-- <= 0) throw new Error('timed out waiting for objects');
  }
  return conition();
};
export const roundRobin =
  <T>(items: T[]) =>
  (index: number): T =>
    items[index % items.length];

export const check = async (res: Response) =>
  res.ok ? res.json() : error(res.status, JSON.stringify({ res, text: await res.text() }));
export const catchy = async <T>(fn: () => Promise<T>) => {
  try {
    return json(await fn());
  } catch (e) {
    console.warn(e);
    if (!isHttpError(e)) throw e;
    else return json(e.body, { status: e.status });
  }
};
export const tc = async <T = void>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    if (isHttpError(e)) return e.body.message;
    return (e as Error)?.message || 'An unexpected error occurred';
  }
};
