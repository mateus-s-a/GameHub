import { Socket, Namespace } from "socket.io";
import { HangmanLogic, WordService } from "@gamehub/hangman";
import {
  GameEvent,
  HangmanEvent,
  HangmanGuessAction,
  HangmanGameState,
} from "@gamehub/core";

export class HangmanController {
  private games: Map<string, HangmanLogic> = new Map();

  constructor(private namespace: Namespace) {}

  public async initGame(roomId: string, playerIds: string[]) {
    // Eager word fetch - already initialized by WordService.init() on server start
    const word = await WordService.getNextWord();
    const game = new HangmanLogic(word, playerIds);
    this.games.set(roomId, game);
    this.broadcastState(roomId);
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

      // CHECK FOR MATCH TERMINATION
      if (game.isGameOver()) {
        this.namespace
          .to(roomId)
          .emit(HangmanEvent.MATCH_OVER, game.getPublicState());

        // Automated 10-second delay before returning to lobby
        setTimeout(() => {
          this.terminateMatch(roomId);
        }, 10000);
      }
    }
  }

  private terminateMatch(roomId: string) {
    const game = this.games.get(roomId);
    if (!game) return;

    // Reset room status via RoomManager (imported as singleton or passed)
    const { roomManager } = require("../RoomManager");
    const room = roomManager.getRoom(roomId);
    if (room) {
      room.status = "waiting";
      room.players.forEach((p: any) => (p.isReady = false));
      this.namespace.to(roomId).emit("roomLobbyUpdate", room);
    }

    this.removeGame(roomId);
    this.namespace.to(roomId).emit("matchTerminated");
  }

  /**
   * DIFFERENTIAL BROADCASTING:
   * Prevents progress leakage by sending personalized states to each player.
   */
  private broadcastState(roomId: string) {
    const game = this.games.get(roomId);
    if (!game) return;

    const fullState = game.getPublicState();
    const playerIds = Object.keys(fullState.players);

    playerIds.forEach((targetPlayerId) => {
      // Create a masked version for this specific player
      const maskedPlayers: Record<string, any> = {};

      playerIds.forEach((pId) => {
        const pState = fullState.players[pId];
        if (pId === targetPlayerId || pState?.status !== "playing") {
          // Owner sees their own word, or everyone sees solved/failed words
          maskedPlayers[pId] = pState;
        } else {
          // Mask opponent's revealed letters but show progress
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
        .emit(GameEvent.STATE_UPDATE, personalizedState);
    });
  }

  public removeGame(roomId: string) {
    this.games.delete(roomId);
  }
}
