export type RPSChoice = "rock" | "paper" | "scissors";
export type RoundState =
  | "waiting_players"
  | "commit_phase"
  | "reveal_phase"
  | "game_over";

export interface PlayerState {
  id: string;
  hasCommitted: boolean;
  score: number;
}

export interface RPSConfig {
  maxRounds?: number;
  timeLimit?: number; // 0 means unlimited
}

export class RPSLogic {
  state: RoundState;
  players: Map<string, PlayerState>;
  private commitments: Map<string, RPSChoice>;
  maxRounds: number;
  currentRound: number;
  private timer: NodeJS.Timeout | null = null;
  rematchRequests: Set<string>;

  timeLimit: number;
  turnEndTime: number | null;

  constructor(maxRounds = 3, config?: RPSConfig) {
    this.state = "waiting_players";
    this.players = new Map();
    this.commitments = new Map();
    this.maxRounds = config?.maxRounds || maxRounds;
    this.currentRound = 1;
    this.rematchRequests = new Set();
    this.timeLimit = config?.timeLimit || 0;
    this.turnEndTime = null;
  }

  addPlayer(id: string): boolean {
    if (this.players.size >= 2 || this.players.has(id)) return false;
    this.players.set(id, { id, hasCommitted: false, score: 0 });

    if (this.players.size === 2) {
      this.beginCommitPhase();
    }
    return true;
  }

  removePlayer(id: string) {
    this.players.delete(id);
    this.commitments.delete(id);
    this.rematchRequests.delete(id);
    this.state = "waiting_players";
    if (this.timer) clearTimeout(this.timer);
  }

  requestRematch(id: string): boolean {
    if (!this.players.has(id)) return false;
    this.rematchRequests.add(id);
    return this.rematchRequests.size === this.players.size;
  }

  reset() {
    this.currentRound = 1;
    this.rematchRequests.clear();
    for (const player of this.players.values()) {
      player.score = 0;
    }
    this.beginCommitPhase();
  }

  commitChoice(playerId: string, choice: RPSChoice): boolean {
    if (this.state !== "commit_phase") return false;
    if (!this.players.has(playerId)) return false;
    if (this.commitments.has(playerId)) return false; // Already committed

    this.commitments.set(playerId, choice);
    this.players.get(playerId)!.hasCommitted = true;

    // Check if both committed
    if (this.commitments.size === 2) {
      this.resolveRound();
    }
    return true;
  }

  startTurnTimer() {
    if (this.timeLimit > 0) {
      this.turnEndTime = Date.now() + this.timeLimit * 1000;
    } else {
      this.turnEndTime = null;
    }
  }

  // Called to start a new round or clear timers
  beginCommitPhase() {
    this.state = "commit_phase";
    this.commitments.clear();
    for (const player of this.players.values()) {
      player.hasCommitted = false;
    }
    this.startTurnTimer();
  }

  private resolveRound() {
    this.state = "reveal_phase";

    const [p1, p2] = Array.from(this.commitments.entries());
    if (!p1 || !p2) return; // Should never happen if commitments.size === 2

    const winnerId = this.determineWinner(p1, p2);

    if (winnerId !== "draw") {
      this.players.get(winnerId)!.score += 1;
    }

    // Usually the server will broadcast the result here, then wait a few seconds before the next round
  }

  nextRound() {
    if (this.currentRound >= this.maxRounds) {
      this.state = "game_over";
      return;
    }

    this.currentRound += 1;
    this.beginCommitPhase();
  }

  private determineWinner(
    [id1, choice1]: [string, RPSChoice],
    [id2, choice2]: [string, RPSChoice],
  ): string {
    if (choice1 === choice2) return "draw";

    if (
      (choice1 === "rock" && choice2 === "scissors") ||
      (choice1 === "paper" && choice2 === "rock") ||
      (choice1 === "scissors" && choice2 === "paper")
    ) {
      return id1;
    }

    return id2;
  }

  getPublicState() {
    return {
      state: this.state,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      // Do NOT send the commitments if in commit_phase to prevent cheating
      players: Array.from(this.players.values()),
      rematchRequests: Array.from(this.rematchRequests),
      timeLimit: this.timeLimit,
      turnEndTime: this.turnEndTime,
      ...(this.state === "reveal_phase" || this.state === "game_over"
        ? { choices: Object.fromEntries(this.commitments) }
        : {}),
    };
  }

  updateConfig(config: RPSConfig) {
    if (config.maxRounds) this.maxRounds = config.maxRounds;
    if (config.timeLimit !== undefined) this.timeLimit = config.timeLimit;
  }
}
