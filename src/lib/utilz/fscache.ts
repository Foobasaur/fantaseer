import { dev } from '$app/environment';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { timez } from './morph';

export async function cached<T>(key: string, fn: () => Promise<T>, ttl = timez.hour(12)): Promise<T> {
  const cashed = async () => {
    const { default: raw } = await import(`../../../.cache/${key}.json?raw`);
    return JSON.parse(raw);
  };
  try {
    if (['mock', 'extension'].includes(import.meta.env.VITE_TARGET)) {
      const cache = dev ? join(process.cwd(), '.cache') : '/tmp/.cache';
      console.log(`Cache lookup for key: ${key}`, { cache, ttl });

      const path = join(cache, key + '.json');
      const hit = await stat(path).catch(() => null);
      if (hit && Date.now() - hit.mtimeMs < ttl) {
        console.log(`cache hit for key: ${key} (age ${Math.round((Date.now() - hit.mtimeMs) / 1000)}s)`);
        return JSON.parse(await readFile(path, 'utf8')) as T;
      } else {
        console.log(`fetching data for key: ${key}`, new Date().toLocaleTimeString());
        const data = await fn();
        await mkdir(cache, { recursive: true });
        await writeFile(path, JSON.stringify(data));
        console.log(`cached data for key: ${key} at ${path}`, new Date().toLocaleTimeString());
        return data;
      }
    } else return cashed();
  } catch (error) {
    console.warn(`Error in cached function for key: ${key}`, error);
    return cashed();
  }
}
