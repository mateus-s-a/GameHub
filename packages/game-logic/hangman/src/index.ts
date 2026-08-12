import type {
  HangmanGameState,
  HangmanPlayerState,
  HangmanPlayerStatus,
  HangmanConfig,
} from "@gamehub/core";

export const DEFAULT_WORDS = [
  "TYPESCRIPT",
  "CAROUSEL",
  "STUNNING",
  "MONOCHROME",
  "GEOMETRIC",
  "INTELLIGENT",
  "FRAMEWORK",
  "ANIMATION",
];

export const MAX_ATTEMPTS = 6;

export class HangmanEngine {
  static createInitialState(
    playerIds: string[],
    wordLength: number,
    config: HangmanConfig,
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
        score: 0,
      };
    });

    return {
      players,
      winners: [],
      currentRound: 1,
      maxRounds: config.maxRounds,
      timeLimitSec: config.timeLimitSec,
      turnEndTime: null,
      rematchRequests: [],
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

export class WordService {
  private static buffer: string[] = [];
  private static BUFFER_SIZE = 10;
  private static API_URL =
    "https://random-word-api.herokuapp.com/word?number=1";

  static async init() {
    await this.fillBuffer();
  }

  static async getNextWord(): Promise<string> {
    if (this.buffer.length === 0) {
      console.warn("[WordService] Buffer empty, using fallback.");
      return this.getFallbackWord();
    }

    const word = this.buffer.shift()!;
    this.fillBuffer(); // Replenish in background
    return word.toUpperCase();
  }

  static async generateWordsForMatch(count: number): Promise<string[]> {
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      words.push(await this.getNextWord());
    }
    return words;
  }

  private static async fillBuffer() {
    const needed = this.BUFFER_SIZE - this.buffer.length;
    if (needed <= 0) return;

    try {
      // Fetch batch from API
      const response = await fetch(`${this.API_URL}&number=${needed}`);
      if (response.ok) {
        const words = await response.json();
        this.buffer.push(...words);
      } else {
        throw new Error("API failed");
      }
    } catch (error) {
      console.error("[WordService] Failed to fetch words:", error);
      // Fill with fallback words if API fails
      while (this.buffer.length < this.BUFFER_SIZE) {
        this.buffer.push(this.getFallbackWord());
      }
    }
  }

  private static getFallbackWord(): string {
    const randomIndex = Math.floor(Math.random() * DEFAULT_WORDS.length);
    return DEFAULT_WORDS[randomIndex]!;
  }
}

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

    return (
      this.state.rematchRequests.length ===
      Object.keys(this.state.players).length
    );
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
