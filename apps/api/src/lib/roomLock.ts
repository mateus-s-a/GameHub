/**
 * RoomActionLockManager
 * Prevents race conditions (Double-Move Glitch) and automated spam/macros (Anti-Autoclicker)
 * by managing atomic room locks and per-player action cooldowns on the server.
 */
export class RoomActionLockManager {
  private activeLocks: Map<string, { expiresAt: number }> = new Map();
  private playerCooldowns: Map<string, number> = new Map();

  /**
   * Attempts to acquire an atomic lock for a room.
   * If the room is already locked and the lock has not expired, returns false.
   * Otherwise acquires the lock with the specified TTL (default: 1200ms) to prevent deadlocks.
   */
  public acquireLock(roomId: string, ttlMs: number = 1200): boolean {
    const now = Date.now();
    const existing = this.activeLocks.get(roomId);

    if (existing && existing.expiresAt > now) {
      return false;
    }

    this.activeLocks.set(roomId, { expiresAt: now + ttlMs });
    return true;
  }

  /**
   * Releases the lock for a room immediately.
   */
  public releaseLock(roomId: string): void {
    this.activeLocks.delete(roomId);
  }

  /**
   * Checks whether a room is currently locked (e.g., during active transitions/animations).
   */
  public isRoomLocked(roomId: string): boolean {
    const existing = this.activeLocks.get(roomId);
    if (!existing) return false;
    if (Date.now() >= existing.expiresAt) {
      this.activeLocks.delete(roomId);
      return false;
    }
    return true;
  }

  /**
   * Locks the room for an explicit animation/transition duration (e.g. 1.5s mismatch delay).
   */
  public lockForTransition(roomId: string, durationMs: number): void {
    this.activeLocks.set(roomId, { expiresAt: Date.now() + durationMs });
  }

  /**
   * Checks whether the player has respected the minimum cooldown between moves (default: 250ms).
   * Automatically updates the timestamp if allowed.
   */
  public checkCooldown(
    roomId: string,
    playerId: string,
    cooldownMs: number = 250,
  ): { allowed: boolean; remainingMs: number } {
    const now = Date.now();
    const key = `${roomId}:${playerId}`;
    const lastAction = this.playerCooldowns.get(key);

    if (lastAction) {
      const elapsed = now - lastAction;
      if (elapsed < cooldownMs) {
        return { allowed: false, remainingMs: cooldownMs - elapsed };
      }
    }

    this.playerCooldowns.set(key, now);
    return { allowed: true, remainingMs: 0 };
  }

  /**
   * Cleans up room lock and player cooldown records when a room is destroyed.
   */
  public clearRoom(roomId: string): void {
    this.activeLocks.delete(roomId);
    const prefix = `${roomId}:`;
    for (const key of this.playerCooldowns.keys()) {
      if (key.startsWith(prefix)) {
        this.playerCooldowns.delete(key);
      }
    }
  }
}

export const roomActionLock = new RoomActionLockManager();

/**
 * Universal Lag Compensation Buffer (ms)
 * Gives players with high network latency a fair tolerance window
 * before server timeout triggers an automated move or round termination.
 */
export const LAG_COMPENSATION_BUFFER_MS = 500;
