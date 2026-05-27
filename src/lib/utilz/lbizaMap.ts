export class lbizaMap<K, V> extends Map<K, V> {
  getOrSet(key: K, value: V): V {
     if (this.has(key)) return this.get(key)!;
     this.set(key, value);
     return value;
   }
   getOrCompute(key: K, factory: (key: K) => V): V {
     if (this.has(key)) return this.get(key)!;
     const v = factory(key);
     this.set(key, v);
     return v;
   }
}