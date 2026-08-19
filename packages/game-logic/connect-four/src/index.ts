export type ConnectFourColor = "RED" | "YELLOW";
export type ConnectFourCell = ConnectFourColor | null;

export type ConnectFourState =
  | "waiting_players"
  | "playing"
  | "round_result"
  | "game_over";

export interface ConnectFourConfig {
  maxRounds?: number;
  timeLimit?: number; // 0 means unlimited
}

export interface WinningLine {
  color: ConnectFourColor;
  coords: [number, number][]; // [row, col] list of 4 winning pieces
}

export const CONNECT_FOUR_COLS = 7;
export const CONNECT_FOUR_ROWS = 6;

export class ConnectFourLogic {
  // 6 rows x 7 columns. Row 0 is the bottom, Row 5 is the top.
  board: ConnectFourCell[][];
  currentPlayer: ConnectFourColor;
  winner: ConnectFourColor | "Draw" | null;
  winningLine: WinningLine | null;
  players: Map<string, ConnectFourColor>;
  rematchRequests: Set<string>;

  maxRounds: number;
  currentRound: number;
  timeLimit: number;
  turnEndTime: number | null;
  scores: Record<ConnectFourColor, number>;

  constructor(config?: ConnectFourConfig) {
    this.board = this.createEmptyBoard();
    this.currentPlayer = "RED";
    this.winner = null;
    this.winningLine = null;
    this.players = new Map();
    this.rematchRequests = new Set();

    this.maxRounds = config?.maxRounds || 1;
    this.timeLimit = config?.timeLimit || 0;
    this.currentRound = 1;
    this.turnEndTime = null;
    this.scores = { RED: 0, YELLOW: 0 };
  }

  private createEmptyBoard(): ConnectFourCell[][] {
    return Array.from({ length: CONNECT_FOUR_ROWS }, () =>
      Array(CONNECT_FOUR_COLS).fill(null),
    );
  }

  get state(): ConnectFourState {
    if (this.players.size < 2) return "waiting_players";
    if (this.winner) {
      return this.currentRound < this.maxRounds ? "round_result" : "game_over";
    }
    return "playing";
  }

  addPlayer(id: string): ConnectFourColor | null {
    if (this.players.size >= 2 || this.players.has(id)) return null;
    const color: ConnectFourColor = this.players.size === 0 ? "RED" : "YELLOW";
    this.players.set(id, color);
    return color;
  }

  startGame() {
    this.startTurnTimer();
  }

  removePlayer(id: string) {
    this.players.delete(id);
    this.rematchRequests.delete(id);
  }

  requestRematch(id: string): boolean {
    if (!this.players.has(id)) return false;
    this.rematchRequests.add(id);
    return this.rematchRequests.size === this.players.size;
  }

  startTurnTimer() {
    if (this.timeLimit > 0) {
      this.turnEndTime = Date.now() + this.timeLimit * 1000;
    } else {
      this.turnEndTime = null;
    }
  }

  /**
   * Drops a disc in the specified column (0 to 6).
   * Returns true if the move was valid and executed.
   */
  makeMove(id: string, col: number): boolean {
    const playerColor = this.players.get(id);
    if (!playerColor || playerColor !== this.currentPlayer || this.winner) {
      return false;
    }

    if (col < 0 || col >= CONNECT_FOUR_COLS) return false;

    // Find the lowest unoccupied row from bottom (0) to top (5)
    let targetRow = -1;
    for (let r = 0; r < CONNECT_FOUR_ROWS; r++) {
      const rowArr = this.board[r];
      if (rowArr && rowArr[col] === null) {
        targetRow = r;
        break;
      }
    }

    // Column is completely full
    if (targetRow === -1) return false;

    const rowArray = this.board[targetRow];
    if (!rowArray) return false;
    rowArray[col] = playerColor;

    this.checkWinner(targetRow, col);

    if (!this.winner) {
      this.currentPlayer = this.currentPlayer === "RED" ? "YELLOW" : "RED";
      this.startTurnTimer();
    } else if (this.winner !== "Draw") {
      this.scores[this.winner]++;
    }

    return true;
  }

  private checkWinner(lastRow: number, lastCol: number) {
    const color = this.board[lastRow]?.[lastCol];
    if (!color) return;

    const directions: [number, number][] = [
      [0, 1], // Horizontal
      [1, 0], // Vertical
      [1, 1], // Diagonal Up-Right
      [1, -1], // Diagonal Down-Right
    ];

    for (const [dr, dc] of directions) {
      const coords: [number, number][] = [[lastRow, lastCol]];

      // Positive direction
      let r = lastRow + dr;
      let c = lastCol + dc;
      while (
        r >= 0 &&
        r < CONNECT_FOUR_ROWS &&
        c >= 0 &&
        c < CONNECT_FOUR_COLS &&
        this.board[r]?.[c] === color
      ) {
        coords.push([r, c]);
        r += dr;
        c += dc;
      }

      // Negative direction
      r = lastRow - dr;
      c = lastCol - dc;
      while (
        r >= 0 &&
        r < CONNECT_FOUR_ROWS &&
        c >= 0 &&
        c < CONNECT_FOUR_COLS &&
        this.board[r]?.[c] === color
      ) {
        coords.push([r, c]);
        r -= dr;
        c -= dc;
      }

      if (coords.length >= 4) {
        this.winner = color;
        this.winningLine = { color, coords };
        return;
      }
    }

    // Check if board is full (all slots in the top row are filled)
    const topRow = this.board[CONNECT_FOUR_ROWS - 1];
    const isFull = topRow ? topRow.every((cell) => cell !== null) : false;
    if (isFull) {
      this.winner = "Draw";
    }
  }

  nextRound() {
    this.board = this.createEmptyBoard();
    this.currentRound++;
    // Alternate starting player each round
    this.currentPlayer = this.currentRound % 2 === 1 ? "RED" : "YELLOW";
    this.winner = null;
    this.winningLine = null;
    this.startTurnTimer();
  }

  reset() {
    this.board = this.createEmptyBoard();
    this.currentPlayer = "RED";
    this.winner = null;
    this.winningLine = null;
    this.rematchRequests.clear();
    this.currentRound = 1;
    this.scores = { RED: 0, YELLOW: 0 };
    this.startTurnTimer();
  }

  getPublicState() {
    return {
      state: this.state,
      board: this.board,
      currentPlayer: this.currentPlayer,
      winner: this.winner,
      winningLine: this.winningLine,
      players: Array.from(this.players.entries()).map(([id, color]) => ({
        id,
        color,
      })),
      rematchRequests: Array.from(this.rematchRequests),
      maxRounds: this.maxRounds,
      currentRound: this.currentRound,
      timeLimit: this.timeLimit,
      turnEndTime: this.turnEndTime,
      scores: this.scores,
    };
  }

  updateConfig(config: ConnectFourConfig) {
    if (config.maxRounds) this.maxRounds = config.maxRounds;
    if (config.timeLimit !== undefined) this.timeLimit = config.timeLimit;
  }
}
