// TODO?: replace with a proper logging library, or at least add log levels and timestamps
// info(message?: any, ...optionalParams: any[]): void;
// log(message?: any, ...optionalParams: any[]): void;
// trace(message?: any, ...optionalParams: any[]): void;
// warn(message?: any, ...optionalParams: any[]): void;

// src/lib/console-proxy.ts
const handler: ProxyHandler<Console> = {
  get(target, prop, receiver) {
    const original = Reflect.get(target, prop, receiver);
    return typeof original === 'function' ? original.bind(target, `[${String(prop)}]`) : original;
  }
};

globalThis.console = new Proxy(console, handler);
