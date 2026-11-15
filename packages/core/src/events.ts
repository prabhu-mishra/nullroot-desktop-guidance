/**
 * Event system for NullRoot Desktop Guidance
 */

import type { Result } from '@nullroot/shared';

export type EventName =
  | 'knowledge:loaded'
  | 'knowledge:updated'
  | 'knowledge:deleted'
  | 'index:building'
  | 'index:built'
  | 'index:failed'
  | 'search:performed'
  | 'config:changed'
  | 'source:added'
  | 'source:removed'
  | 'analyzer:started'
  | 'analyzer:completed'
  | 'analyzer:failed';

export interface EventMap {
  'knowledge:loaded': { count: number; ecosystem?: string };
  'knowledge:updated': { id: string; ecosystem: string };
  'knowledge:deleted': { id: string };
  'index:building': { ecosystem?: string };
  'index:built': { ecosystem?: string; duration: number; entries: number };
  'index:failed': { ecosystem?: string; error: Error };
  'search:performed': { query: string; results: number; duration: number };
  'config:changed': { key: string; oldValue: unknown; newValue: unknown };
  'source:added': { sourceId: string; ecosystem: string };
  'source:removed': { sourceId: string };
  'analyzer:started': { analyzer: string; target: string };
  'analyzer:completed': { analyzer: string; target: string; issues: number };
  'analyzer:failed': { analyzer: string; target: string; error: Error };
}

type EventListener<T extends EventName> = (payload: EventMap[T]) => void | Promise<void>;

interface ListenerEntry {
  name: EventName;
  listener: EventListener<any>;
  once: boolean;
}

export class EventEmitter {
  private listeners: ListenerEntry[] = [];
  private maxListeners = 100;

  on<T extends EventName>(name: T, listener: EventListener<T>): () => void {
    if (this.listeners.length >= this.maxListeners) {
      console.warn(`EventEmitter: max listeners (${this.maxListeners}) reached`);
    }
    this.listeners.push({ name, listener, once: false });
    return () => this.off(name, listener);
  }

  once<T extends EventName>(name: T, listener: EventListener<T>): () => void {
    this.listeners.push({ name, listener, once: true });
    return () => this.off(name, listener);
  }

  off<T extends EventName>(name: T, listener: EventListener<T>): void {
    const index = this.listeners.findIndex(
      (entry) => entry.name === name && entry.listener === listener
    );
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  emit<T extends EventName>(name: T, payload: EventMap[T]): void {
    const entries = this.listeners.filter((entry) => entry.name === name);
    const toRemove: ListenerEntry[] = [];

    for (const entry of entries) {
      try {
        const result = entry.listener(payload);
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error(`Event listener error for ${name}:`, error);
          });
        }
      } catch (error) {
        console.error(`Event listener error for ${name}:`, error);
      }

      if (entry.once) {
        toRemove.push(entry);
      }
    }

    for (const entry of toRemove) {
      this.off(entry.name, entry.listener);
    }
  }

  listenerCount(name: EventName): number {
    return this.listeners.filter((entry) => entry.name === name).length;
  }

  removeAllListeners(name?: EventName): void {
    if (name) {
      this.listeners = this.listeners.filter((entry) => entry.name !== name);
    } else {
      this.listeners = [];
    }
  }
}

export const globalEvents = new EventEmitter();