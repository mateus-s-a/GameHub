import { HangmanGameState, HangmanPlayerState } from "@gamehub/core";
import { HangmanEngine } from "./engine";

export class HangmanLogic {
  public state: HangmanGameState;
  private secretWord: string;

  constructor(word: string, playerIds: string[]) {
    this.secretWord = word.toUpperCase();
    this.state = HangmanEngine.createInitialState(playerIds, word.length);
  }

  public submitGuess(playerId: string, letter: string): boolean {
    const prevState = JSON.stringify(this.state);
    this.state = HangmanEngine.processGuess(
      this.state,
      playerId,
      letter,
      this.secretWord,
    );
    // Return true if state changed
    return prevState !== JSON.stringify(this.state);
  }

  public getPublicState() {
    return this.state;
  }

  public isGameOver(): boolean {
    return Object.values(this.state.players).every(
      (p: HangmanPlayerState) => p.status !== "playing",
    );
  }
}
