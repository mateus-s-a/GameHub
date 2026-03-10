export type PlayerMark = 'X' | 'O' | null;

export class TicTacToeLogic {
  board: PlayerMark[];
  currentPlayer: PlayerMark;
  winner: PlayerMark | 'Draw';
  
  constructor() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.winner = null;
  }

  makeMove(index: number, playerMark: PlayerMark): boolean {
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
}
