import { Injectable, type MessageEvent } from '@nestjs/common';
import { interval, map, merge, Observable } from 'rxjs';

/** Keeps the connection open through proxies that close idle ones. */
const HEARTBEAT_MS = 25_000;

/**
 * Open real-time streams, per user: a user may have several tabs open.
 * Held in memory, so events only reach the clients of this instance; several
 * instances would need a shared bus, e.g. PostgreSQL LISTEN/NOTIFY.
 */
@Injectable()
export class NotificationStreams {
  private readonly listeners = new Map<string, Set<(data: object) => void>>();

  /** Events sent to the user until the client goes away, with a heartbeat. */
  open(userId: string): Observable<MessageEvent> {
    const events = new Observable<MessageEvent>((subscriber) => {
      const listener = (data: object) => subscriber.next({ data });
      const userListeners = this.listeners.get(userId) ?? new Set();
      userListeners.add(listener);
      this.listeners.set(userId, userListeners);
      return () => {
        userListeners.delete(listener);
        if (userListeners.size === 0) {
          this.listeners.delete(userId);
        }
      };
    });
    const heartbeat = interval(HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ type: 'ping', data: '' })),
    );
    return merge(events, heartbeat);
  }

  /** Sends an event to every open stream of the user, if any. */
  send(userId: string, data: object): void {
    this.listeners.get(userId)?.forEach((listener) => listener(data));
  }
}
