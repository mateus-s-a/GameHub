import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";

const JWT_SECRET =
  process.env.JWT_SECRET || "gamehub_default_secret_key_change_me_in_prod";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface TokenPayload {
  userId: string;
  username: string;
  displayName: string;
  sessionId?: string;
}

export class AuthService {
  public static hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  public static comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });
  }

  public static verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Ensure a Session exists for a guest or user.
   * Safe with DB connection resilience.
   */
  public static async getOrCreateSession(
    sessionId?: string,
    guestName?: string,
    userId?: string,
  ): Promise<{ id: string; guestName: string | null; userId: string | null }> {
    const id = sessionId || randomUUID();
    const defaultName = guestName || `GUEST-${id.substring(0, 5).toUpperCase()}`;

    try {
      const existing = await prisma.session.findUnique({
        where: { id },
      });

      if (existing) {
        if (userId && existing.userId !== userId) {
          const updated = await prisma.session.update({
            where: { id },
            data: { userId, lastActive: new Date() },
          });
          return { id: updated.id, guestName: updated.guestName, userId: updated.userId };
        }
        return { id: existing.id, guestName: existing.guestName, userId: existing.userId };
      }

      const created = await prisma.session.create({
        data: {
          id,
          userId: userId || null,
          guestName: userId ? null : defaultName,
        },
      });

      return { id: created.id, guestName: created.guestName, userId: created.userId };
    } catch (err) {
      console.warn("[AuthService] DB session sync unavailable, using ephemeral session:", (err as Error).message);
      return { id, guestName: defaultName, userId: userId || null };
    }
  }

  public static async register(
    username: string,
    password: string,
    displayName: string,
    sessionId?: string,
  ) {
    const existing = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (existing) {
      throw new Error("Username already taken");
    }

    const passwordHash = await this.hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        passwordHash,
        displayName: displayName.trim(),
      },
    });

    const session = await this.getOrCreateSession(sessionId, undefined, user.id);
    const token = this.generateToken({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      sessionId: session.id,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      sessionId: session.id,
      token,
    };
  }

  public static async login(
    username: string,
    password: string,
    sessionId?: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      throw new Error("Invalid username or password");
    }

    const isValid = await this.comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid username or password");
    }

    const session = await this.getOrCreateSession(sessionId, undefined, user.id);
    const token = this.generateToken({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      sessionId: session.id,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      sessionId: session.id,
      token,
    };
  }

  public static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return user;
  }
}
