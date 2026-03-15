export type PlayerMark = 'X' | 'O' | null;

export class TicTacToeLogic {
  board: PlayerMark[];
  currentPlayer: PlayerMark;
  winner: PlayerMark | 'Draw';
  players: Map<string, PlayerMark>;
  
  constructor() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.winner = null;
    this.players = new Map();
  }

  addPlayer(id: string): PlayerMark | null {
    if (this.players.size >= 2 || this.players.has(id)) return null;
    const mark: PlayerMark = this.players.size === 0 ? 'X' : 'O';
    this.players.set(id, mark);
    return mark;
  }

  removePlayer(id: string) {
    this.players.delete(id);
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

  reset() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.winner = null;
  }

  getPublicState() {
    return {
      board: this.board,
      currentPlayer: this.currentPlayer,
      winner: this.winner
    };
  }
}
