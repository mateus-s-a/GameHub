import { Socket, Namespace } from "socket.io";
import { HangmanLogic, WordService } from "@gamehub/hangman";
import {
  GameEvent,
  HangmanEvent,
  HangmanGuessAction,
  HangmanGameState,
} from "@gamehub/core";
import { handleAutoReturnToLobby, cancelAutoReturnToLobby } from "../LobbyEvents.js";

export class HangmanController {
  private games: Map<string, HangmanLogic> = new Map();

  constructor(private namespace: Namespace) {}

  public async initGame(
    roomId: string,
    playerIds: string[],
    config: any,
  ) {
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

    if (game.submitGuess(socket.id, action.letter)) {
      this.broadcastState(roomId);

      const player = game.state.players[socket.id];
      if (player?.status === "solved") {
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
      // Transition to next round after 5 seconds
      setTimeout(async () => {
        await this.startNextRound(roomId);
      }, 5000);
    } else {
      // End of match
      this.namespace
        .to(roomId)
        .emit(HangmanEvent.MATCH_OVER, game.getPublicState());

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
    this.games.delete(roomId);
  }
}
