import { ensure } from './polly';

export class AMap<K, V> extends Map<K, V> {
  constructor(private factory?: (key: K) => V) {
    super();
  }
  getOrSet(key: K, value: V): V {
    if (this.has(key)) return this.get(key)!;
    this.set(key, value);
    return value;
  }
  compute(key: K, f?: (key: K) => V): V {
    if (this.has(key)) return this.get(key)!;
    const v = ensure(f?.(key) || this.factory?.(key), `No value for key ${key} and no factory provided`);
    this.set(key, v);
    return v;
  }
  async getOrAwait(key: K, factory: () => Promise<V>): Promise<V> {
    if (this.has(key)) return this.get(key)!;
    const v = await factory();
    this.set(key, v);
    return v;
  }

  static New<K>() {
    return <V>(factory?: (key: K) => V) => new AMap<K, V>(factory);
  }
}
