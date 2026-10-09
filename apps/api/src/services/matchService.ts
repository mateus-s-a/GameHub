import { prisma } from "../lib/prisma";
import { RoomInfo } from "@gamehub/types";

/**
 * MatchService
 * Handles auditable persistence of game matches, results, and player scores in Neon PostgreSQL via Prisma.
 * All methods are fail-safe and non-blocking: database outages or connection delays will never crash WebSockets.
 */
export class MatchService {
  /**
   * Helper to verify if a userId actually exists in the database to prevent foreign key errors.
   */
  private static async getValidUserId(userId?: string): Promise<string | null> {
    if (!userId) return null;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      return user ? user.id : null;
    } catch {
      return null;
    }
  }

  /**
   * Records the start of a match when countdown completes and game begins.
   */
  public static async recordMatchStart(room: RoomInfo): Promise<void> {
    try {
      const host = room.players.find((p) => p.isHost);
      const validHostId = await this.getValidUserId(host?.userId);

      // Validate user IDs for players to preserve relational integrity
      const playerCreations = await Promise.all(
        room.players.map(async (p) => {
          const validUserId = await this.getValidUserId(p.userId);
          return {
            sessionId: p.id,
            userId: validUserId,
            score: 0,
            isWinner: false,
          };
        }),
      );

      await prisma.match.upsert({
        where: { id: room.id },
        create: {
          id: room.id,
          gameType: room.gameType,
          status: "IN_PROGRESS",
          hostId: validHostId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: (room.config as any) || {},
          players: {
            create: playerCreations,
          },
        },
        update: {
          status: "IN_PROGRESS",
        },
      });

      console.log(
        `[MatchService] Match ${room.id.substring(0, 8)} started in DB for ${room.gameType.toUpperCase()}`,
      );
    } catch (err) {
      console.warn(
        `[MatchService] Could not persist match start for ${room.id.substring(0, 8)}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  /**
   * Records match completion, marking winner and updating scores.
   */
  public static async recordMatchFinish(
    roomId: string,
    result: {
      winnerId?: string | null;
      scores?: Record<string, number>;
    },
  ): Promise<void> {
    try {
      const existingMatch = await prisma.match.findUnique({
        where: { id: roomId },
        include: { players: true },
      });

      if (!existingMatch) {
        console.warn(
          `[MatchService] Match ${roomId.substring(0, 8)} not found in DB for finish update`,
        );
        return;
      }

      await prisma.match.update({
        where: { id: roomId },
        data: {
          status: "FINISHED",
          endedAt: new Date(),
          winnerId: result.winnerId || null,
        },
      });

      // Update individual player scores and winner flags if scores provided
      if (result.scores) {
        for (const [playerId, score] of Object.entries(result.scores)) {
          const isWinner = Boolean(
            result.winnerId &&
              (result.winnerId === playerId ||
                result.winnerId.toUpperCase() === playerId.toUpperCase()),
          );

          await prisma.matchPlayer.updateMany({
            where: {
              matchId: roomId,
              sessionId: playerId,
            },
            data: {
              score,
              isWinner,
            },
          });
        }
      }

      console.log(
        `[MatchService] Match ${roomId.substring(0, 8)} finalized in DB. Winner: ${result.winnerId || "Draw/None"}`,
      );
    } catch (err) {
      console.warn(
        `[MatchService] Could not persist match finish for ${roomId.substring(0, 8)}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  /**
   * Records match abandonment when a game terminates prematurely.
   */
  public static async recordMatchAbandon(roomId: string): Promise<void> {
    try {
      await prisma.match.updateMany({
        where: {
          id: roomId,
          status: { in: ["WAITING", "IN_PROGRESS"] },
        },
        data: {
          status: "ABANDONED",
          endedAt: new Date(),
        },
      });

      console.log(
        `[MatchService] Match ${roomId.substring(0, 8)} marked as ABANDONED in DB`,
      );
    } catch (err) {
      console.warn(
        `[MatchService] Could not record match abandon for ${roomId.substring(0, 8)}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}
