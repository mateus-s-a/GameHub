// Guess the Flag Game Logic

export interface GTFPlayer {
  id: string;
  score: number;
  hasGuessed: boolean;
  currentGuess: string | null;
}

export type GTFRoundState = 'waiting_players' | 'guessing_phase' | 'round_result' | 'game_over';

export interface GTFCountry {
  name: string;
  flagUrl: string;
}

export class GuessTheFlagLogic {
  state: GTFRoundState;
  players: Map<string, GTFPlayer>;
  maxRounds: number;
  currentRound: number;
  
  // The current correct country flag and name
  currentCountry: GTFCountry | null = null;
  // Options presented to players (including the correct one)
  currentOptions: string[] = [];

  constructor(maxRounds = 5) {
    this.state = 'waiting_players';
    this.players = new Map();
    this.maxRounds = maxRounds;
    this.currentRound = 1;
  }

  addPlayer(id: string): boolean {
    if (this.players.size >= 2 || this.players.has(id)) return false;
    this.players.set(id, { id, score: 0, hasGuessed: false, currentGuess: null });
    
    if (this.players.size === 2) {
      this.state = 'guessing_phase';
    }
    return true;
  }

  removePlayer(id: string) {
    this.players.delete(id);
    this.state = 'waiting_players';
  }

  startRound(country: GTFCountry, options: string[]) {
    this.currentCountry = country;
    this.currentOptions = options;
    this.state = 'guessing_phase';
    for (const player of this.players.values()) {
      player.hasGuessed = false;
      player.currentGuess = null;
    }
  }

  submitGuess(playerId: string, guess: string): boolean {
    if (this.state !== 'guessing_phase') return false;
    const player = this.players.get(playerId);
    if (!player || player.hasGuessed) return false;

    player.hasGuessed = true;
    player.currentGuess = guess;

    if (this.currentCountry && guess === this.currentCountry.name) {
      // First to guess correctly could get more points, or they both get 1 point if correct.
      // Let's keep it simple: any correct answer gives 1 point.
      player.score += 1;
    }

    // Check if everyone guessed
    let allGuessed = true;
    for (const p of this.players.values()) {
      if (!p.hasGuessed) {
        allGuessed = false;
        break;
      }
    }

    if (allGuessed) {
      this.state = 'round_result';
    }

    return true;
  }

  timeoutRound() {
    if (this.state === 'guessing_phase') {
      this.state = 'round_result';
    }
  }

  nextRound() {
    if (this.currentRound >= this.maxRounds) {
      this.state = 'game_over';
      return;
    }
    this.currentRound += 1;
    this.state = 'guessing_phase';
  }

  getPublicState() {
    return {
      state: this.state,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        score: p.score,
        hasGuessed: p.hasGuessed,
        // Only reveal guesses in result or game over phase, to prevent cheating
        currentGuess: (this.state === 'round_result' || this.state === 'game_over') ? p.currentGuess : null
      })),
      flagUrl: this.currentCountry?.flagUrl || null,
      options: this.currentOptions,
      // Only reveal the correct country name in the result state
      correctCountry: (this.state === 'round_result' || this.state === 'game_over') ? this.currentCountry?.name : null
    };
  }
}
