/**
 * Generic event map - maps event names to their payload types
 */
type EventMap = Record<string, any>;

/**
 * Extract event names from EventMap
 */
type EventKey<T extends EventMap> = string & keyof T;

/**
 * Event receiver/listener function type
 */
type EventReceiver<T> = (...params: T[]) => void;

export class Emitter<T extends EventMap = EventMap> {
  private events: Map<string, Set<EventReceiver<any>>> = new Map();
  /**
   * Register an event listener
   */
  on<K extends EventKey<T>>(event: K, fn: EventReceiver<T[K]>) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(fn);
    console.log(`Listener added for event: ${event}`);
    return this;
  }

  /**
   * Register a one-time event listener
   */
  once<K extends EventKey<T>>(event: K, fn: EventReceiver<T[K]>) {
    const onceWrapper = (...args: any[]) => {
      fn(...args);
      this.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * Remove an event listener
   */
  off<K extends EventKey<T>>(event: K, fn: EventReceiver<T[K]>) {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(fn);

      console.log(`Listener removed for event: ${event}`);
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
    return this;
  }

  /**
   * Emit an event
   */
  emit<K extends EventKey<T>>(event: K, ...params: T[K][]) {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) return false;

    listeners.forEach(listener => {
      try {
        listener(...params);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
    console.log(`Event emitted: ${event}`);
    return true;
  }

  /**
   * Remove all listeners for an event (or all events if no name provided)
   */
  removeAllListeners<K extends EventKey<T>>(event?: K) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  /**
   * Get listener count for an event
   */
  listenerCount<K extends EventKey<T>>(event: K) {
    return this.events.get(event)?.size || 0;
  }

  /**
   * Get all event names
   */
  eventNames() {
    return Array.from(this.events.keys()) as Array<EventKey<T>>;
  }

  /**
   * Get all listeners for an event
   */
  getListeners<K extends EventKey<T>>(eventName: K) {
    const listeners = this.events.get(eventName);
    return Array.from(listeners || []) as Array<EventReceiver<T[K]>>;
  }
}
