import { Socket, Namespace } from "socket.io";
import { HangmanLogic, WordService } from "@gamehub/hangman";
import {
  GameEvent,
  HangmanEvent,
  HangmanGuessAction,
  HangmanGameState,
} from "@gamehub/core";
import {
  handleAutoReturnToLobby,
  cancelAutoReturnToLobby,
} from "../LobbyEvents";
import { roomManager } from "../RoomManager";
import { roomActionLock } from "../lib/roomLock";
import { MatchService } from "../services/matchService";

export class HangmanController {
  private games: Map<string, HangmanLogic> = new Map();

  constructor(private namespace: Namespace) {}

  public async initGame(roomId: string, playerIds: string[], config: any) {
    const normalizedConfig = this.normalizeHangmanConfig(config);
    // Eager word fetch - already initialized by WordService.init() on server start
    const word = await WordService.getNextWord();
    const game = new HangmanLogic(word, playerIds, {
      maxRounds: normalizedConfig.maxRounds,
      timeLimitSec: normalizedConfig.timeLimitSec,
    });

    // Set match timer with network buffer (3s)
    game.state.turnEndTime =
      Date.now() + normalizedConfig.timeLimitSec * 1000 + 3000;

    this.games.set(roomId, game);
    this.broadcastState(roomId);
  }

  private normalizeHangmanConfig(raw?: any) {
    return {
      maxRounds: Math.min(10, Math.max(1, raw?.maxRounds ?? 3)),
      timeLimitSec: Math.min(300, Math.max(5, raw?.timeLimit ?? 60)),
    };
  }

  public handleMove(
    socket: Socket,
    roomId: string,
    action: HangmanGuessAction,
  ) {
    const game = this.games.get(roomId);
    if (!game) return;

    if (roomActionLock.isRoomLocked(roomId) || game.state.isTransitioning) {
      socket.emit("invalidMove", {
        event: "gameMove",
        reason: "ROOM_LOCKED",
        message: "Aguarde o início da próxima rodada!",
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
        event: "gameMove",
        reason: "ACTION_COOLDOWN",
        message: "Aguarde antes da próxima jogada.",
      });
      return;
    }

    const playerKey = game.state.players[socket.id]
      ? socket.id
      : (game.state.players[effectivePlayerId] ? effectivePlayerId : null);

    if (!playerKey) {
      socket.emit("invalidMove", {
        event: "gameMove",
        reason: "NOT_YOUR_TURN",
        message: "Você não está participando desta partida!",
      });
      return;
    }

    const player = game.state.players[playerKey];
    if (!player) {
      socket.emit("invalidMove", {
        event: "gameMove",
        reason: "NOT_YOUR_TURN",
        message: "Jogador não encontrado nesta partida!",
      });
      return;
    }

    if (player.status === "solved" || player.status === "failed") {
      socket.emit("invalidMove", {
        event: "gameMove",
        reason: "ALREADY_COMMITTED",
        message: "Você já concluiu esta rodada!",
      });
      return;
    }

    const letterUpper = (action.letter || "").toUpperCase();
    if (player.guessedLetters && player.guessedLetters.includes(letterUpper)) {
      socket.emit("invalidMove", {
        event: "gameMove",
        reason: "INVALID_POSITION",
        message: `A letra ${letterUpper} já foi tentada!`,
      });
      return;
    }

    if (game.submitGuess(playerKey, action.letter)) {
      this.broadcastState(roomId);

      const updatedPlayer = game.state.players[playerKey];
      if (updatedPlayer?.status === "solved") {
        socket.emit(HangmanEvent.PLAYER_SOLVED);
      }

      // CHECK FOR ROUND COMPLETION
      if (game.isGameOver()) {
        this.handleRoundEnd(roomId);
      }
    }
  }

  private async handleRoundEnd(roomId: string) {
    const game = this.games.get(roomId);
    if (!game || game.state.turnEndTime === null) return;

    // Clear the timer immediately to prevent multiple triggers from checkTimeouts
    game.state.turnEndTime = null;
    game.state.isTransitioning = true;
    game.state.nextRoundStartTime = Date.now() + 5000;
    this.broadcastState(roomId);

    if (game.state.currentRound < game.state.maxRounds) {
      roomActionLock.lockForTransition(roomId, 5000);
      // Transition to next round after 5 seconds
      setTimeout(async () => {
        await this.startNextRound(roomId);
      }, 5000);
    } else {
      // End of match
      this.namespace
        .to(roomId)
        .emit(HangmanEvent.MATCH_OVER, game.getPublicState());

      // Persist finished match in DB
      let highestScore = -1;
      let winnerId: string | null = null;
      const scores: Record<string, number> = {};
      for (const [pId, p] of Object.entries(game.state.players)) {
        scores[pId] = p.score;
        if (p.score > highestScore) {
          highestScore = p.score;
          winnerId = pId;
        } else if (p.score === highestScore) {
          winnerId = null; // tie
        }
      }
      MatchService.recordMatchFinish(roomId, { winnerId, scores });

      // 10-second delay before returning to lobby (Using project-wide root logic)
      handleAutoReturnToLobby(this.namespace, roomId, this.games);
    }
  }

  private async startNextRound(roomId: string) {
    const game = this.games.get(roomId);
    if (!game) return;

    const newWord = await WordService.getNextWord();
    game.nextRound(newWord);
    game.state.isTransitioning = false;
    game.state.nextRoundStartTime = null;

    // Refresh timer
    game.state.turnEndTime = Date.now() + game.state.timeLimitSec * 1000 + 3000;

    roomActionLock.releaseLock(roomId);
    this.broadcastState(roomId);
  }

  public async checkTimeouts() {
    const now = Date.now();
    for (const [roomId, game] of this.games.entries()) {
      if (game.state.turnEndTime && now >= game.state.turnEndTime) {
        game.handleTimeout();
        this.broadcastState(roomId);
        this.handleRoundEnd(roomId);
      }
    }
  }

  public async handleRematch(socketId: string, roomId: string) {
    const game = this.games.get(roomId);
    if (!game) return;

    if (game.requestRematch(socketId)) {
      // Consensus reached! Reset game logic
      cancelAutoReturnToLobby(roomId);
      const playerIds = Object.keys(game.state.players);
      const config = {
        maxRounds: game.state.maxRounds,
        timeLimit: game.state.timeLimitSec,
      };
      await this.initGame(roomId, playerIds, config);
      this.namespace.to(roomId).emit("rematchStarted");
    } else {
      // Just one so far, notify others via state update
      this.broadcastState(roomId);
    }
  }

  private broadcastState(roomId: string) {
    const game = this.games.get(roomId);
    if (!game) return;

    const fullState = game.getPublicState();
    const playerIds = Object.keys(fullState.players);

    playerIds.forEach((targetPlayerId) => {
      const maskedPlayers: Record<string, any> = {};

      playerIds.forEach((pId) => {
        const pState = fullState.players[pId];
        if (pId === targetPlayerId || pState?.status !== "playing") {
          maskedPlayers[pId] = pState;
        } else {
          maskedPlayers[pId] = {
            ...pState,
            maskedWord: "_".repeat(pState.maskedWord.length),
          };
        }
      });

      const personalizedState: HangmanGameState = {
        ...fullState,
        players: maskedPlayers as any,
      };

      this.namespace
        .to(targetPlayerId)
        .emit(HangmanEvent.STATE_UPDATE, personalizedState);
    });
  }

  public removeGame(roomId: string) {
    roomActionLock.clearRoom(roomId);
    this.games.delete(roomId);
  }
}
