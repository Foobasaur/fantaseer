import { dev } from '$app/environment';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { timez } from './morph';

export async function cached<T>(key: string, fn: () => Promise<T>, ttl = timez.hour(12)): Promise<T> {
  const cache = dev ? join(process.cwd(), '.cache') : '/tmp/.cache';
  console.log(`Cache lookup for key: ${key}`, { cache, ttl });
  const file = join(cache, key + (key.endsWith('.json') ? '' : '.json'));
  const hit = await stat(file).catch(() => null);
  if (hit && Date.now() - hit.mtimeMs < ttl) {
    console.log(`cache hit for key: ${key} (age ${Math.round((Date.now() - hit.mtimeMs) / 1000)}s)`);
    return JSON.parse(await readFile(file, 'utf8')) as T;
  }

  console.log(`fetching data for key: ${key}`, new Date().toLocaleTimeString());
  const data = await fn();
  await mkdir(cache, { recursive: true });
  await writeFile(file, JSON.stringify(data));
  console.log(`cached data for key: ${key} at ${file}`, new Date().toLocaleTimeString());
  return data;
}
