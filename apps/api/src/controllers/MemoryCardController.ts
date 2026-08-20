import { Socket, Namespace } from "socket.io";
import { MemoryCardLogic, MemoryCardConfig } from "@gamehub/memory-card";
import {
  handleAutoReturnToLobby,
  cancelAutoReturnToLobby,
} from "../LobbyEvents";

export class MemoryCardController {
  private games: Map<string, MemoryCardLogic> = new Map();
  private mismatchTimeouts: Map<string, NodeJS.Timeout> = new Map();

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
  }

  public handleFlipCard(
    socket: Socket,
    roomId: string,
    { cardId }: { cardId: number }
  ) {
    const game = this.games.get(roomId);
    if (!game) return;

    const result = game.flipCard(socket.id, cardId);
    if (!result.success) return;

    this.broadcastState(roomId);

    if (result.matchResult === "mismatch") {
      // Delay de 1.5s para memorização visual de todos os jogadores antes de desvirar
      const timeout = setTimeout(() => {
        game.resolveMismatch();
        this.mismatchTimeouts.delete(roomId);
        this.broadcastState(roomId);
      }, 1500);

      this.mismatchTimeouts.set(roomId, timeout);
    } else if (game.state.status === "round_result") {
      setTimeout(() => {
        game.nextRound();
        this.broadcastState(roomId);
      }, 3000);
    } else if (game.state.status === "game_over") {
      handleAutoReturnToLobby(this.namespace, roomId, this.games);
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

  public checkTimeouts() {
    const now = Date.now();
    for (const [roomId, game] of this.games.entries()) {
      if (!game || !game.state) continue;

      if (
        game.state.status === "playing" &&
        game.state.turnEndTime &&
        now >= game.state.turnEndTime
      ) {
        // Se houver mismatch timeout pendente na sala, cancela
        if (this.mismatchTimeouts.has(roomId)) {
          clearTimeout(this.mismatchTimeouts.get(roomId));
          this.mismatchTimeouts.delete(roomId);
        }

        game.handleTimeout();
        this.broadcastState(roomId);
      }
    }
  }

  public broadcastState(roomId: string) {
    const game = this.games.get(roomId);
    if (!game || !game.state) return;
    this.namespace.to(roomId).emit("gameState", game.state);
  }

  public removeGame(roomId: string) {
    if (this.mismatchTimeouts.has(roomId)) {
      clearTimeout(this.mismatchTimeouts.get(roomId));
      this.mismatchTimeouts.delete(roomId);
    }
    this.games.delete(roomId);
  }

  public getGame(roomId: string): MemoryCardLogic | undefined {
    return this.games.get(roomId);
  }

  public getGamesMap(): Map<string, MemoryCardLogic> {
    return this.games;
  }
}
