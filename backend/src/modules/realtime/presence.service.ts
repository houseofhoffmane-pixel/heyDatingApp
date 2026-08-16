import { Injectable } from '@nestjs/common';

/**
 * In-process presence tracker. Replaces the Redis `presence:<userId>` set
 * used before Sprint 2. Single-process deploy makes this correct:
 * everyone who's connected is connected to *this* Node.
 *
 * Shape: `Map<userId, Set<socketId>>`. The gateway calls add()/remove()
 * on connect/disconnect; RealtimeService.isUserOnline() reads it.
 */
@Injectable()
export class PresenceService {
  private readonly bySocketsByUser = new Map<string, Set<string>>();

  add(userId: string, socketId: string): void {
    let set = this.bySocketsByUser.get(userId);
    if (!set) {
      set = new Set();
      this.bySocketsByUser.set(userId, set);
    }
    set.add(socketId);
  }

  remove(userId: string, socketId: string): void {
    const set = this.bySocketsByUser.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) this.bySocketsByUser.delete(userId);
  }

  isOnline(userId: string): boolean {
    const set = this.bySocketsByUser.get(userId);
    return !!set && set.size > 0;
  }

  /** Test-only — wipe presence between specs. */
  resetAll(): void {
    this.bySocketsByUser.clear();
  }
}
