import { Socket, Namespace } from "socket.io";
import { HangmanLogic, WordService } from "@gamehub/hangman";
import { GameEvent, HangmanEvent, HangmanGuessAction } from "@gamehub/core";

export class HangmanController {
  private games: Map<string, HangmanLogic> = new Map();

  constructor(private namespace: Namespace) {}

  public async initGame(roomId: string, playerIds: string[]) {
    const word = await WordService.getNextWord();
    const game = new HangmanLogic(word, playerIds);
    this.games.set(roomId, game);
    this.broadcastState(roomId);
  }

  public handleMove(socket: Socket, roomId: string, action: HangmanGuessAction) {
    const game = this.games.get(roomId);
    if (!game) return;

    if (game.submitGuess(socket.id, action.letter)) {
      this.broadcastState(roomId);
      
      // Check if this specific player just solved it to trigger a private event if needed
      const player = game.state.players[socket.id];
      if (player?.status === "solved") {
        socket.emit(HangmanEvent.PLAYER_SOLVED);
      }
    }
  }

  private broadcastState(roomId: string) {
    const game = this.games.get(roomId);
    if (game) {
      this.namespace.to(roomId).emit(GameEvent.STATE_UPDATE, game.getPublicState());
    }
  }

  public removeGame(roomId: string) {
    this.games.delete(roomId);
  }
}
