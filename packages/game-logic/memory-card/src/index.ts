export type CardSymbol =
  | "arcade_ghost"
  | "arcade_pac"
  | "arcade_invader"
  | "arcade_joystick"
  | "cyber_neon"
  | "cyber_cpu"
  | "cyber_sword"
  | "cyber_skull"
  | "space_planet"
  | "space_rocket"
  | "space_star"
  | "space_comet"
  | "gem_diamond"
  | "gem_ruby"
  | "gem_emerald"
  | "gem_sapphire"
  | "animal_fox"
  | "animal_owl"
  | "animal_dragon"
  | "animal_wolf"
  | "magic_orb"
  | "magic_scroll"
  | "magic_wand"
  | "magic_potion";

export const ALL_CARD_SYMBOLS: CardSymbol[] = [
  "arcade_ghost",
  "arcade_pac",
  "arcade_invader",
  "arcade_joystick",
  "cyber_neon",
  "cyber_cpu",
  "cyber_sword",
  "cyber_skull",
  "space_planet",
  "space_rocket",
  "space_star",
  "space_comet",
  "gem_diamond",
  "gem_ruby",
  "gem_emerald",
  "gem_sapphire",
  "animal_fox",
  "animal_owl",
  "animal_dragon",
  "animal_wolf",
  "magic_orb",
  "magic_scroll",
  "magic_wand",
  "magic_potion",
];

export interface Card {
  id: number;
  symbol: CardSymbol;
  isFlipped: boolean;
  isMatched: boolean;
  matchedByPlayerId: string | null;
}

export interface MemoryCardConfig {
  mode: "standard" | "custom";
  rows?: number;
  cols?: number;
  iconSet?: "arcade" | "cyber" | "space" | "gems";
  maxRounds?: number;
  timeLimit?: number;
}

export interface MemoryCardState {
  cards: Card[];
  flippedCardIds: number[];
  grid: { rows: number; cols: number };
  scores: Record<string, number>;
  turnPlayerId: string;
  playersOrder: string[];
  isCheckingMatch: boolean;
  winnerId: string | "Draw" | null;
  status: "waiting_players" | "playing" | "round_result" | "game_over";
  maxRounds: number;
  currentRound: number;
  timeLimit: number;
  turnEndTime: number | null;
}

export class MemoryCardLogic {
  cards: Card[];
  flippedCardIds: number[];
  grid: { rows: number; cols: number };
  scores: Map<string, number>;
  playersOrder: string[];
  currentTurnIndex: number;
  isCheckingMatch: boolean;
  winner: string | "Draw" | null;
  config: MemoryCardConfig;

  maxRounds: number;
  currentRound: number;
  timeLimit: number;
  turnEndTime: number | null;
  rematchRequests: Set<string>;

  constructor(playerIds: string[], config?: MemoryCardConfig) {
    this.playersOrder = [...playerIds];
    // Sorteio aleatório do jogador inicial no 1º turno
    this.currentTurnIndex =
      playerIds.length > 0 ? Math.floor(Math.random() * playerIds.length) : 0;

    this.flippedCardIds = [];
    this.scores = new Map();
    this.playersOrder.forEach((id) => this.scores.set(id, 0));
    this.isCheckingMatch = false;
    this.winner = null;
    this.config = config || { mode: "standard" };
    this.rematchRequests = new Set();

    this.maxRounds = this.config.maxRounds || 1;
    this.timeLimit = this.config.timeLimit || 0;
    this.currentRound = 1;
    this.turnEndTime = null;

    this.grid = this.calculateGridDimensions(playerIds.length, this.config);
    this.cards = this.generateDeck(
      this.grid.rows,
      this.grid.cols,
      this.config.iconSet
    );

    if (this.playersOrder.length >= 2) {
      this.startTurnTimer();
    }
  }

  private calculateGridDimensions(
    playerCount: number,
    config: MemoryCardConfig
  ) {
    if (config.mode === "custom" && config.rows && config.cols) {
      return { rows: config.rows, cols: config.cols };
    }
    // Modo Standard Autorritativo Dinâmico
    switch (playerCount) {
      case 3:
        return { rows: 5, cols: 6 }; // 30 cartas (15 pares)
      case 4:
        return { rows: 5, cols: 8 }; // 40 cartas (20 pares)
      case 2:
      default:
        return { rows: 4, cols: 6 }; // 24 cartas (12 pares)
    }
  }

  private generateDeck(
    rows: number,
    cols: number,
    iconSet = "arcade"
  ): Card[] {
    const totalCards = rows * cols;
    const totalPairs = Math.floor(totalCards / 2);

    const availableSymbols = [...ALL_CARD_SYMBOLS];
    const selectedSymbols: CardSymbol[] = [];

    for (let i = 0; i < totalPairs; i++) {
      selectedSymbols.push(availableSymbols[i % availableSymbols.length]!);
    }

    const rawDeck: CardSymbol[] = [];
    selectedSymbols.forEach((sym) => {
      rawDeck.push(sym, sym);
    });

    // Fisher-Yates Shuffle
    for (let i = rawDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = rawDeck[i]!;
      rawDeck[i] = rawDeck[j]!;
      rawDeck[j] = temp;
    }

    return rawDeck.map((symbol, idx) => ({
      id: idx,
      symbol,
      isFlipped: false,
      isMatched: false,
      matchedByPlayerId: null,
    }));
  }

  startTurnTimer() {
    if (this.timeLimit > 0) {
      this.turnEndTime = Date.now() + this.timeLimit * 1000;
    } else {
      this.turnEndTime = null;
    }
  }

  get state(): MemoryCardState {
    const status: MemoryCardState["status"] =
      this.playersOrder.length < 2
        ? "waiting_players"
        : this.winner
          ? this.currentRound < this.maxRounds
            ? "round_result"
            : "game_over"
          : "playing";

    const scoresObj: Record<string, number> = {};
    this.scores.forEach((val, key) => {
      scoresObj[key] = val;
    });

    return {
      cards: this.cards,
      flippedCardIds: this.flippedCardIds,
      grid: this.grid,
      scores: scoresObj,
      turnPlayerId: this.playersOrder[this.currentTurnIndex] || "",
      playersOrder: this.playersOrder,
      isCheckingMatch: this.isCheckingMatch,
      winnerId: this.winner,
      status,
      maxRounds: this.maxRounds,
      currentRound: this.currentRound,
      timeLimit: this.timeLimit,
      turnEndTime: this.turnEndTime,
    };
  }

  flipCard(
    playerId: string,
    cardId: number
  ): { success: boolean; matchResult?: "match" | "mismatch" } {
    if (this.isCheckingMatch || this.winner) return { success: false };
    if (this.playersOrder[this.currentTurnIndex] !== playerId)
      return { success: false };

    const card = this.cards[cardId];
    if (!card || card.isFlipped || card.isMatched) return { success: false };

    card.isFlipped = true;
    this.flippedCardIds.push(cardId);

    // Se virou a 2ª carta do turno
    if (this.flippedCardIds.length === 2) {
      const id1 = this.flippedCardIds[0]!;
      const id2 = this.flippedCardIds[1]!;
      const card1 = this.cards[id1]!;
      const card2 = this.cards[id2]!;

      if (card1.symbol === card2.symbol) {
        // MATCH!
        card1.isMatched = true;
        card2.isMatched = true;
        card1.matchedByPlayerId = playerId;
        card2.matchedByPlayerId = playerId;

        const currentScore = this.scores.get(playerId) || 0;
        this.scores.set(playerId, currentScore + 1);

        this.flippedCardIds = [];
        this.checkGameOver();

        if (!this.winner) {
          this.startTurnTimer();
        }
        return { success: true, matchResult: "match" };
      } else {
        // MISMATCH!
        this.isCheckingMatch = true;
        return { success: true, matchResult: "mismatch" };
      }
    }

    return { success: true };
  }

  resolveMismatch() {
    if (!this.isCheckingMatch) return;
    this.flippedCardIds.forEach((id) => {
      if (this.cards[id]) this.cards[id]!.isFlipped = false;
    });
    this.flippedCardIds = [];
    this.isCheckingMatch = false;

    // Avança para o próximo jogador
    if (this.playersOrder.length > 0) {
      this.currentTurnIndex =
        (this.currentTurnIndex + 1) % this.playersOrder.length;
    }
    this.startTurnTimer();
  }

  handleTimeout() {
    if (this.winner || this.playersOrder.length < 2) return;

    // Se houver cartas viradas no momento do estouro de tempo, desvira
    if (this.flippedCardIds.length > 0) {
      this.flippedCardIds.forEach((id) => {
        if (this.cards[id]) this.cards[id]!.isFlipped = false;
      });
      this.flippedCardIds = [];
      this.isCheckingMatch = false;
    }

    // Avança para o próximo jogador
    this.currentTurnIndex =
      (this.currentTurnIndex + 1) % this.playersOrder.length;
    this.startTurnTimer();
  }

  private checkGameOver() {
    const allMatched = this.cards.every((c) => c.isMatched);
    if (allMatched) {
      let maxScore = -1;
      let topPlayer: string | null = null;
      let isTie = false;

      this.scores.forEach((score, pId) => {
        if (score > maxScore) {
          maxScore = score;
          topPlayer = pId;
          isTie = false;
        } else if (score === maxScore) {
          isTie = true;
        }
      });

      this.winner = isTie ? "Draw" : topPlayer;
      this.turnEndTime = null;
    }
  }

  requestRematch(playerId: string): boolean {
    if (!this.winner) return false;
    this.rematchRequests.add(playerId);
    if (this.rematchRequests.size >= this.playersOrder.length) {
      this.resetMatch();
      return true;
    }
    return false;
  }

  resetMatch() {
    this.rematchRequests.clear();
    this.winner = null;
    this.isCheckingMatch = false;
    this.flippedCardIds = [];
    this.cards = this.generateDeck(
      this.grid.rows,
      this.grid.cols,
      this.config.iconSet
    );
    this.scores.forEach((_, key) => this.scores.set(key, 0));
    this.currentTurnIndex = Math.floor(Math.random() * this.playersOrder.length);
    this.startTurnTimer();
  }

  addPlayer(id: string): boolean {
    if (this.playersOrder.includes(id) || this.playersOrder.length >= 4)
      return false;
    this.playersOrder.push(id);
    this.scores.set(id, 0);
    this.grid = this.calculateGridDimensions(
      this.playersOrder.length,
      this.config
    );
    this.cards = this.generateDeck(
      this.grid.rows,
      this.grid.cols,
      this.config.iconSet
    );
    if (this.playersOrder.length >= 2 && !this.turnEndTime) {
      this.startTurnTimer();
    }
    return true;
  }

  removePlayer(id: string) {
    const idx = this.playersOrder.indexOf(id);
    if (idx !== -1) {
      this.playersOrder.splice(idx, 1);
      this.scores.delete(id);
      if (this.currentTurnIndex >= this.playersOrder.length) {
        this.currentTurnIndex = 0;
      }
      if (this.playersOrder.length < 2) {
        this.turnEndTime = null;
      }
    }
  }
}
