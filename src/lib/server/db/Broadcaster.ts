import type { Server } from '@';
import { error } from '@sveltejs/kit';
import { $insert } from './kit';

export class BroadcastLedger<T extends Server.DB.Tablekey> {
  private cleanuper: ReturnType<typeof setInterval>;
  private pending = new Map<string, Server.DB.Infertable[T] & { expiresAt: number }>();
  private prepared = new Map<Server.DB.Tablekey, Server.DB.Infertable<'Insert'>[Server.DB.Tablekey][]>();

  constructor() {
    this.cleanuper = setInterval(() => this.sweep(), 60_000);
  }

  private async sweep() {
    const now = Date.now();
    for (const [nonce, entry] of this.pending) {
      if (now > entry.expiresAt) this.pending.delete(nonce);
    }
    for (const [key, values] of this.prepared) {
      if (values.length) await $insert(key)(values as any);
    }
    this.prepared.clear();
  }

  register(event: Server.DB.Infertable[T]) {
    const nonce = crypto.randomUUID();
    this.pending.set(nonce, { ...event, expiresAt: Date.now() + 30_000 });
    return nonce;
  }

  verify(nonce: string) {
    const entry = this.pending.get(nonce);
    if (!entry) error(400, 'Invalid or expired nonce');
    if (Date.now() > entry.expiresAt) {
      this.pending.delete(nonce);
      error(400, 'Nonce expired');
    }
    return entry;
  }

  prepare<K extends Server.DB.Tablekey>(key: K, value: Server.DB.Infertable<'Insert'>[K]) {
    this.prepared.set(key, [...(this.prepared.get(key) || []), value]);
  }

  /** Call after successful observer insert if you want single-use nonces */
  consume(nonce: string) {
    this.pending.delete(nonce);
  }

  destroy() {
    clearInterval(this.cleanuper);
    this.pending.clear();
  }
}
