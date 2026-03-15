export type PlayerMark = 'X' | 'O' | null;

export interface TTTConfig {
  maxRounds?: number;
  timeLimit?: number; // 0 means unlimited
}

export class TicTacToeLogic {
  board: PlayerMark[];
  currentPlayer: PlayerMark;
  winner: PlayerMark | 'Draw';
  players: Map<string, PlayerMark>;
  rematchRequests: Set<string>;
  
  maxRounds: number;
  currentRound: number;
  timeLimit: number;
  turnEndTime: number | null;
  scores: Record<'X' | 'O', number>;
  
  constructor(config?: TTTConfig) {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.winner = null;
    this.players = new Map();
    this.rematchRequests = new Set();

    this.maxRounds = config?.maxRounds || 1;
    this.timeLimit = config?.timeLimit || 0;
    this.currentRound = 1;
    this.turnEndTime = null;
    this.scores = { 'X': 0, 'O': 0 };
  }

  addPlayer(id: string): PlayerMark | null {
    if (this.players.size >= 2 || this.players.has(id)) return null;
    const mark: PlayerMark = this.players.size === 0 ? 'X' : 'O';
    this.players.set(id, mark);
    return mark;
  }

  removePlayer(id: string) {
    this.players.delete(id);
    this.rematchRequests.delete(id);
  }

  requestRematch(id: string): boolean {
    if (!this.players.has(id)) return false;
    this.rematchRequests.add(id);
    return this.rematchRequests.size === 2; // Returns true if both want a rematch
  }

  startTurnTimer() {
    if (this.timeLimit > 0) {
      this.turnEndTime = Date.now() + this.timeLimit * 1000;
    } else {
      this.turnEndTime = null;
    }
  }

  makeMove(id: string, index: number): boolean {
    const playerMark = this.players.get(id);
    if (!playerMark) return false;

    if (this.winner || this.board[index] || playerMark !== this.currentPlayer) {
      return false; // Invalid move
    }

    this.board[index] = playerMark;
    this.checkWinner();
    
    if (!this.winner) {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
      this.startTurnTimer();
    } else if (this.winner !== 'Draw') {
      this.scores[this.winner as 'X' | 'O']++;
    }
    
    return true;
  }

  checkWinner() {
    const lines: [number, number, number][] = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];

    for (let line of lines) {
      const [a, b, c] = line;
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        this.winner = this.board[a];
        return;
      }
    }

    if (!this.board.includes(null)) {
      this.winner = 'Draw';
    }
  }

  nextRound() {
    this.board = Array(9).fill(null);
    // Alternate starting player each round
    this.currentPlayer = this.currentRound % 2 === 0 ? 'X' : 'O';
    this.winner = null;
    this.turnEndTime = null;
  }

  reset() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.winner = null;
    this.rematchRequests.clear();
    this.currentRound = 1;
    this.scores = { 'X': 0, 'O': 0 };
    this.turnEndTime = null;
  }

  getPublicState() {
    return {
      board: this.board,
      currentPlayer: this.currentPlayer,
      winner: this.winner,
      players: Array.from(this.players.entries()).map(([id, mark]) => ({ id, mark })),
      rematchRequests: Array.from(this.rematchRequests),
      maxRounds: this.maxRounds,
      currentRound: this.currentRound,
      timeLimit: this.timeLimit,
      turnEndTime: this.turnEndTime,
      scores: this.scores
    };
  }
}
