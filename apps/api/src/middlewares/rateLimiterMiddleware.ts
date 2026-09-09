import rateLimit from "express-rate-limit";
import { Socket } from "socket.io";
import { RateLimitExceededEvent } from "@gamehub/types";

/**
 * Express Rate Limiter for sensitive authentication routes (/api/auth/*).
 * Max 15 attempts per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication requests from this IP. Please try again after 15 minutes.",
  },
});

/**
 * Express Rate Limiter for general API endpoints (/api/*).
 * Max 150 requests per 15 minutes per IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please slow down.",
  },
});

interface SocketRateRecord {
  timestamps: number[];
}

// In-memory sliding-window bucket: Map<"key:eventName", SocketRateRecord>
const socketRateMap = new Map<string, SocketRateRecord>();

// Periodic garbage collection to prevent memory leak (runs every 60 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of socketRateMap.entries()) {
    // Keep only timestamps from the last 15 seconds
    record.timestamps = record.timestamps.filter((ts) => now - ts < 15000);
    if (record.timestamps.length === 0) {
      socketRateMap.delete(key);
    }
  }
}, 60000);

/**
 * Validates whether an incoming WebSocket event exceeds the rate limit.
 * Emits a "rateLimitExceeded" event to the socket if exceeded and returns false.
 *
 * @param socket The connected client Socket.io instance
 * @param eventName Identifier of the action being rate limited
 * @param maxEvents Max allowed events within the window (default: 10)
 * @param windowSeconds Window duration in seconds (default: 3)
 */
export function checkSocketRateLimit(
  socket: Socket,
  eventName: string,
  maxEvents = 10,
  windowSeconds = 3,
): boolean {
  const identifier =
    socket.data?.sessionId || socket.handshake.auth?.sessionId || socket.id;
  const key = `${identifier}:${eventName}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  let record = socketRateMap.get(key);
  if (!record) {
    record = { timestamps: [] };
    socketRateMap.set(key, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxEvents) {
    const oldest = record.timestamps[0] ?? now;
    const retryAfterMs = Math.max(1000, windowMs - (now - oldest));
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    const payload: RateLimitExceededEvent = {
      event: eventName,
      message: `Too many '${eventName}' requests. Please slow down and wait ${retryAfterSeconds}s.`,
      retryAfterSeconds,
    };

    socket.emit("rateLimitExceeded", payload);
    return false;
  }

  record.timestamps.push(now);
  return true;
}
