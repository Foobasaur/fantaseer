// ============================================
// PubSub Client — Browser-side subscription helper
// ============================================
// Wraps Twitch.ext.listen / unlisten / send with:
//  - Typed events via Emitter
//  - Automatic JSON parse of incoming messages
//  - Managed listener lifecycle (cleanup on destroy)
//
// Usage:
//   const ps = new PubSubClient(window.Twitch.ext);
//   ps.subscribe('broadcast', (msg) => console.log(msg.data));
//   ps.subscribe('whisper-U12345', (msg) => console.log(msg.data));
//   // Broadcaster-only: send directly
//   ps.publish('broadcast', { type: 'update', payload: { score: 42 } });
//   // Cleanup
//   ps.destroy();
// ============================================
import type { Twitch } from '../../types';

/**
 * Incoming PubSub message as received by client listeners.
 * Twitch delivers `message` as a JSON string — the client helper parses it.
 */
interface Message<T = unknown> {
  target: string;
  contentType: string;
  data: T;
  raw: string;
}
type Handler<T> = (msg: Message<T>) => void;

/**
 * Callback shape matching Twitch Extension Helper's listen signature.
 */
type ListenerCallback = (target: string, contentType: string, message: string) => void;

/**
 * PubSubClient class for managing Twitch PubSub subscriptions and messages in the browser.
 */
export class PubSubClient {
  private listeners = new Map<string, ListenerCallback>();
  constructor(
    private config?: {
      ext?: Twitch.Ext.TwitchExtensionHelper;
      onMessage?: (msg: Message) => void;
      onError?: (err: Error) => void;
    }
  ) {}

  get helper() {
    return this.config?.ext || window.Twitch.ext;
  }

  /**
   * Get all currently subscribed targets.
   */
  get subscriptions() {
    return Array.from(this.listeners.keys());
  }

  /**
   * Subscribe to a PubSub target.
   * Registers a Twitch.ext.listen callback that auto-parses JSON
   * and emits typed 'message' events.
   *
   * @returns Unsubscribe function for this specific target
   */
  subscribe = <T = unknown>(target: Twitch.PubSub.Target, handler: (msg: Message<T>) => void) => {
    if (this.listeners.has(target)) this.unsubscribe(target);

    const callback: ListenerCallback = (target, contentType, raw) => {
      try {
        const data = JSON.parse(raw) as T;
        const msg: Message<T> = { target, contentType, data, raw };
        console.log('Received PubSub broadcast message:', msg);
        handler(msg);
        this.config?.onMessage?.(msg as Message);
      } catch (err) {
        const error = new Error(`[PubSub] Parse failed on "${target}": ${err instanceof Error ? err.message : String(err)}`);
        this.config?.onError?.(error);
      }
    };

    this.listeners.set(target, callback);
    this.helper.listen(target, callback);
    return () => this.unsubscribe(target);
  };

  /**
   * Unsubscribe from a specific target.
   */
  unsubscribe = (target: Twitch.PubSub.Target) => {
    const callback = this.listeners.get(target);
    if (callback) {
      this.helper.unlisten(target, callback);
      this.listeners.delete(target);
    }
  };

  /**
   * Send a PubSub message directly (broadcaster-only).
   * Uses Twitch.ext.send which is only available to the broadcaster role.
   *
   * @param target   PubSub target ("broadcast", "whisper-<id>", "global")
   * @param message  Payload object — will be JSON.stringify'd
   *
   * @example
   * ```ts
   * ps.publish('broadcast', { type: 'update', payload: { score: 42 } });
   * ```
   */
  publish = (target: Twitch.PubSub.Target, message: unknown) => {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    this.helper.send(target, 'application/json', payload);
  };

  /**
   * Convenience: subscribe to broadcast messages.
   *
   * @example
   * ```json
   * {
   *     "target": "broadcast",
   *     "contentType": "application/json",
   *     "data": {
   *         "event": "test:me",
   *         "payload": {
   *             "doo": "poo"
   *         }
   *     },
   *     "raw": "{\"event\":\"test:me\",\"payload\":{\"doo\":\"poo\"}}"
   * }
   * ```
   */
  onBroadcast = <T = unknown>(handler: Handler<T>) => this.subscribe<T>('broadcast', handler);

  /**
   * Convenience: subscribe to global messages.
   */
  onGlobal = <T = unknown>(handler: Handler<T>) => this.subscribe<T>('global', handler);

  /**
   * Convenience: subscribe to whisper messages for a specific user.
   */
  onWhisper = <T = unknown>(userId: string, handler: Handler<T>) => this.subscribe<T>(`whisper-${userId}`, handler);

  /**
   * Tear down all subscriptions and listeners.
   */
  destroy = () => {
    this.listeners.forEach((callback, target) => this.helper.unlisten(target, callback));
    this.listeners.clear();
  };
}
