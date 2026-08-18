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
  while (!conition() && timeout--) await delay(step);
  return (timeout && conition()) || Promise.reject(new Error('waitFor condition not met in time'));
};

export const faster = (length: number, act: (i: number) => void) => {
  let live = true;
  const timer = setTimeout(() => {
    (async () => {
      // Yield on an item stride, not an elapsed-time budget: the reactive flush after each yield does the
      // heavy part (mounting the components the acts pushed), and it isn't covered by timing the acts —
      // a 3ms act budget let hundreds of items pile into one 200ms+ flush.
      for (let i = 0; live && i < length; i++) {
        if (i && !(i & 63)) await (scheduler?.yield() ?? new Promise(r => setTimeout(r)));
        act(i);
      }
    })();
  }, 50);
  return () => {
    live = false;
    clearTimeout(timer);
  };
};

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

export const check = async (res: Response) =>
  res.ok ? res.json() : error(res.status, JSON.stringify({ res, text: await res.text() }));
export const ensure = <T>(value: T | null | undefined, msg = 'Value is null or undefined'): T | never =>
  (value != null && value) ||
  ((): never => {
    throw new Error(msg);
  })();
