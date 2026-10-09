import { Socket, Namespace } from "socket.io";
import { MemoryCardLogic, MemoryCardConfig } from "@gamehub/memory-card";
import {
  handleAutoReturnToLobby,
  cancelAutoReturnToLobby,
} from "../LobbyEvents";
import { roomManager } from "../RoomManager";
import { roomActionLock, LAG_COMPENSATION_BUFFER_MS } from "../lib/roomLock";
import { roomTimerManager } from "../lib/roomTimer";
import { MatchService } from "../services/matchService";

export class MemoryCardController {
  private games: Map<string, MemoryCardLogic> = new Map();

  constructor(private namespace: Namespace) {}

  public initGame(roomId: string, playerIds: string[], rawConfig?: any) {
    const config: MemoryCardConfig = {
      mode: rawConfig?.mode || "standard",
      maxRounds: rawConfig?.maxRounds || 1,
      timeLimit: rawConfig?.timeLimit || 0,
      iconSet: rawConfig?.iconSet || "arcade",
    };

    if (config.mode === "custom" && rawConfig?.boardSize) {
      const [r, c] = rawConfig.boardSize.split("x").map(Number);
      if (r && c) {
        config.rows = r;
        config.cols = c;
      }
    }

    const game = new MemoryCardLogic(playerIds, config);
    this.games.set(roomId, game);
    this.broadcastState(roomId);
    this.scheduleTurnTimeout(roomId);
  }

  public handleFlipCard(
    socket: Socket,
    roomId: string,
    { cardId }: { cardId: number }
  ) {
    const game = this.games.get(roomId);
    if (!game) return;

    if (
      roomActionLock.isRoomLocked(roomId) ||
      game.isCheckingMatch
    ) {
      socket.emit("invalidMove", {
        event: "flipCard",
        reason: "ROOM_LOCKED",
        message: "Aguarde a resolução das cartas anteriores!",
      });
      return;
    }

    const effectivePlayerId =
      roomManager.getPlayerIdBySocketId(socket.id) ||
      socket.data?.sessionId ||
      socket.id;

    const cd = roomActionLock.checkCooldown(roomId, effectivePlayerId, 250);
    if (!cd.allowed) {
      socket.emit("invalidMove", {
        event: "flipCard",
        reason: "ACTION_COOLDOWN",
        message: "Aguarde antes da próxima jogada.",
      });
      return;
    }

    const activePlayerKey = game.playersOrder.includes(socket.id)
      ? socket.id
      : (game.playersOrder.includes(effectivePlayerId) ? effectivePlayerId : null);

    if (!activePlayerKey) {
      socket.emit("invalidMove", {
        event: "flipCard",
        reason: "NOT_YOUR_TURN",
        message: "Você não está participando desta partida!",
      });
      return;
    }

    if (game.state.status !== "playing") {
      socket.emit("invalidMove", {
        event: "flipCard",
        reason: "GAME_NOT_IN_PROGRESS",
        message: "A partida não está em andamento.",
      });
      return;
    }

    if (game.playersOrder[game.currentTurnIndex] !== activePlayerKey) {
      socket.emit("invalidMove", {
        event: "flipCard",
        reason: "NOT_YOUR_TURN",
        message: "Não é a sua vez de jogar!",
      });
      return;
    }

    const card = game.cards[cardId];
    if (!card || card.isFlipped || card.isMatched) {
      socket.emit("invalidMove", {
        event: "flipCard",
        reason: "INVALID_POSITION",
        message: "Esta carta já foi virada!",
      });
      return;
    }

    const result = game.flipCard(activePlayerKey, cardId);
    if (!result.success) return;

    this.broadcastState(roomId);

    if (result.matchResult === "mismatch") {
      // Cancela o timer de turno anterior e trava a sala por 1.5s
      roomTimerManager.clearTurnTimeout(roomId);
      roomActionLock.lockForTransition(roomId, 1500);

      roomTimerManager.scheduleTransition(roomId, 1500, () => {
        game.resolveMismatch();
        roomActionLock.releaseLock(roomId);
        this.broadcastState(roomId);
        this.scheduleTurnTimeout(roomId);
      });
    } else if ((game.state.status as string) === "round_result") {
      roomTimerManager.clearTurnTimeout(roomId);
      roomActionLock.lockForTransition(roomId, 3000);
      roomTimerManager.scheduleTransition(roomId, 3000, () => {
        game.nextRound();
        roomActionLock.releaseLock(roomId);
        this.broadcastState(roomId);
        this.scheduleTurnTimeout(roomId);
      });
    } else if ((game.state.status as string) === "game_over") {
      roomTimerManager.clearAllTimers(roomId);
      handleAutoReturnToLobby(this.namespace, roomId, this.games);
      const scores: Record<string, number> = {};
      for (const [pId, score] of game.scores.entries()) {
        scores[pId] = score;
      }
      MatchService.recordMatchFinish(roomId, {
        winnerId: game.winner || null,
        scores,
      });
    } else {
      // Jogada concluída sem mismatch: agenda o próximo turno
      this.scheduleTurnTimeout(roomId);
    }
  }

  public handleRematch(socket: Socket, roomId: string) {
    const game = this.games.get(roomId);
    if (!game) return;

    if (game.requestRematch(socket.id)) {
      cancelAutoReturnToLobby(roomId);
      this.namespace.to(roomId).emit("rematchStarted");
      this.broadcastState(roomId);
    } else {
      this.broadcastState(roomId);
    }
  }

  private scheduleTurnTimeout(roomId: string) {
    const game = this.games.get(roomId);
    if (!game || !game.state || game.state.status !== "playing" || !game.state.turnEndTime) {
      roomTimerManager.clearTurnTimeout(roomId);
      return;
    }

    const targetTime = game.state.turnEndTime + LAG_COMPENSATION_BUFFER_MS;
    roomTimerManager.scheduleTurnTimeout(roomId, targetTime, async () => {
      if (!roomActionLock.acquireLock(roomId)) return;
      try {
        const g = this.games.get(roomId);
        if (!g || !g.state || g.state.status !== "playing" || !g.state.turnEndTime) return;
        if (Date.now() < g.state.turnEndTime + LAG_COMPENSATION_BUFFER_MS) return;

        g.handleTimeout();
        this.broadcastState(roomId);
        this.scheduleTurnTimeout(roomId);
      } finally {
        roomActionLock.releaseLock(roomId);
      }
    });
  }

  public checkTimeouts() {
    // Deprecated: substituído por RoomTimerManager orientado a eventos
  }

  public broadcastState(roomId: string) {
    const game = this.games.get(roomId);
    if (!game || !game.state) return;
    this.namespace.to(roomId).emit("gameState", game.state);
  }

  public removeGame(roomId: string) {
    roomTimerManager.clearAllTimers(roomId);
    roomActionLock.clearRoom(roomId);
    this.games.delete(roomId);
  }

  public getGame(roomId: string): MemoryCardLogic | undefined {
    return this.games.get(roomId);
  }

  public getGamesMap(): Map<string, MemoryCardLogic> {
    return this.games;
  }
}
