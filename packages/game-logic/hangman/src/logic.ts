import {
  HangmanGameState,
  HangmanPlayerState,
  HangmanConfig,
} from "@gamehub/core";
import { HangmanEngine } from "./engine.js";

export class HangmanLogic {
  public state: HangmanGameState;
  private secretWord: string;

  constructor(word: string, playerIds: string[], config: HangmanConfig) {
    this.secretWord = word.toUpperCase();
    this.state = HangmanEngine.createInitialState(
      playerIds,
      word.length,
      config,
    );
  }

  public submitGuess(playerId: string, letter: string): boolean {
    const prevState = JSON.stringify(this.state);
    const wasSolved = this.state.players[playerId]?.status === "solved";

    this.state = HangmanEngine.processGuess(
      this.state,
      playerId,
      letter,
      this.secretWord,
    );

    const isSolved = this.state.players[playerId]?.status === "solved";

    // Apply scoring if solved this turn
    if (isSolved && !wasSolved) {
      const rank = this.state.winners.indexOf(playerId);
      const points = HangmanEngine.getScore(rank);
      this.state.players[playerId]!.score += points;
    }

    // Return true if state changed
    return prevState !== JSON.stringify(this.state);
  }

  public nextRound(newWord: string) {
    this.secretWord = newWord.toUpperCase();
    this.state.currentRound += 1;
    this.state.winners = [];

    // Reset player round states but KEEP scores
    Object.keys(this.state.players).forEach((playerId) => {
      const p = this.state.players[playerId]!;
      p.maskedWord = "_".repeat(newWord.length);
      p.guessedLetters = [];
      p.attemptsLeft = 6;
      p.status = "playing";
      p.progress = 0;
    });
  }
 
  public requestRematch(playerId: string): boolean {
    if (!this.state.players[playerId]) return false;
    
    if (!this.state.rematchRequests) {
      this.state.rematchRequests = [];
    }
    
    if (!this.state.rematchRequests.includes(playerId)) {
      this.state.rematchRequests.push(playerId);
    }
    
    return this.state.rematchRequests.length === Object.keys(this.state.players).length;
  }
 
  public handleTimeout() {
    Object.keys(this.state.players).forEach((playerId) => {
      const p = this.state.players[playerId]!;
      if (p.status === "playing") {
        p.status = "failed";
      }
    });
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
