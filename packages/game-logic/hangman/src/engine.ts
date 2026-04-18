import {
  HangmanGameState,
  HangmanPlayerState,
  HangmanPlayerStatus,
} from "@gamehub/core";

export const MAX_ATTEMPTS = 6;

export class HangmanEngine {
  static createInitialState(
    playerIds: string[],
    wordLength: number,
  ): HangmanGameState {
    const players: Record<string, HangmanPlayerState> = {};
    const maskedWord = "_".repeat(wordLength);

    playerIds.forEach((id) => {
      players[id] = {
        maskedWord,
        guessedLetters: [],
        attemptsLeft: MAX_ATTEMPTS,
        status: "playing",
        progress: 0,
      };
    });

    return {
      players,
      winners: [],
    };
  }

  static getMaskedWord(word: string, guessedLetters: string[]): string {
    return word
      .split("")
      .map((char) => (guessedLetters.includes(char) ? char : "_"))
      .join("");
  }

  static calculateProgress(word: string, maskedWord: string): number {
    const total = word.length;
    const solved = maskedWord.split("").filter((c) => c !== "_").length;
    return solved / total;
  }

  static processGuess(
    state: HangmanGameState,
    playerId: string,
    letter: string,
    secretWord: string,
  ): HangmanGameState {
    const player = state.players[playerId];
    if (!player || player.status !== "playing") return state;

    const upperLetter = letter.toUpperCase();
    if (player.guessedLetters.includes(upperLetter)) return state;

    const newGuessedLetters = [...player.guessedLetters, upperLetter];
    const newMaskedWord = this.getMaskedWord(secretWord, newGuessedLetters);
    const isCorrect = secretWord.includes(upperLetter);

    let newAttempts = player.attemptsLeft;
    if (!isCorrect) newAttempts -= 1;

    let newStatus: HangmanPlayerStatus = "playing";
    if (!newMaskedWord.includes("_")) {
      newStatus = "solved";
    } else if (newAttempts <= 0) {
      newStatus = "failed";
    }

    const newProgress = this.calculateProgress(secretWord, newMaskedWord);

    const newPlayers = {
      ...state.players,
      [playerId]: {
        ...player,
        guessedLetters: newGuessedLetters,
        maskedWord: newMaskedWord,
        attemptsLeft: newAttempts,
        status: newStatus,
        progress: newProgress,
      },
    };

    const newWinners = [...state.winners];
    if (newStatus === "solved" && !newWinners.includes(playerId)) {
      newWinners.push(playerId);
    }

    return {
      ...state,
      players: newPlayers,
      winners: newWinners,
    };
  }

  static getScore(rank: number): number {
    const scores = [5, 3, 1];
    return scores[rank] || 0;
  }
}
