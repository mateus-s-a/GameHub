import { Request, Response, NextFunction } from "express";
import { Socket } from "socket.io";
import { AuthService, TokenPayload } from "../services/authService";

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization header missing or invalid" });
    return;
  }

  const token = authHeader.substring(7);
  const payload = AuthService.verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Socket.io middleware for authenticating and establishing session identity.
 * Attaches verified user or guest session info to `socket.data`.
 */
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
) {
  try {
    const token = socket.handshake.auth.token;
    const clientSessionId = socket.handshake.auth.sessionId;
    const clientPlayerName = socket.handshake.auth.playerName;

    if (token && typeof token === "string") {
      const payload = AuthService.verifyToken(token);
      if (payload) {
        socket.data.user = payload;
        socket.data.sessionId = payload.sessionId || clientSessionId || socket.id;
        socket.data.playerName = payload.displayName || payload.username;
        return next();
      }
    }

    // Guest or unauthenticated fallback
    const session = await AuthService.getOrCreateSession(
      clientSessionId,
      clientPlayerName,
    );

    socket.data.user = null;
    socket.data.sessionId = session.id;
    socket.data.playerName =
      clientPlayerName ||
      session.guestName ||
      `PLAYER-${session.id.substring(0, 5).toUpperCase()}`;

    return next();
  } catch (err) {
    console.error("[socketAuthMiddleware] Error handling socket handshake:", err);
    // Even if DB fails, allow socket with ephemeral ID so gameplay is never blocked
    socket.data.user = null;
    socket.data.sessionId = socket.handshake.auth.sessionId || socket.id;
    socket.data.playerName =
      socket.handshake.auth.playerName ||
      `PLAYER-${socket.id.substring(0, 5).toUpperCase()}`;
    return next();
  }
}
