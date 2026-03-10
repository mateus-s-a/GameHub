import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { TicTacToeLogic, PlayerMark } from "@gameshub/tic-tac-toe";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const tttNamespace = io.of('/ttt');

// Simple singleton game instance for the MVP
const games = new Map<string, TicTacToeLogic>();
const players = new Map<string, PlayerMark>();

tttNamespace.on('connection', (socket: Socket) => {
  console.log('A user connected to Tic-Tac-Toe:', socket.id);
  
  // Basic matchmaking: Join a fixed room 'lobby'
  socket.join('lobby');
  
  if (!games.has('lobby')) {
    games.set('lobby', new TicTacToeLogic());
  }

  const game = games.get('lobby')!;
  
  // Assign marks naively for MVP
  const roomClients = tttNamespace.adapter.rooms.get('lobby');
  if (roomClients?.size === 1) {
    players.set(socket.id, 'X');
  } else {
    players.set(socket.id, 'O'); // Subsequent players are Os (or spectators if > 2)
  }

  // Send initial state
  socket.emit('gameState', {
    board: game.board,
    currentPlayer: game.currentPlayer,
    winner: game.winner,
    yourMark: players.get(socket.id)
  });

  socket.on('makeMove', (index: number) => {
    const mark = players.get(socket.id);
    if (!mark) return;

    const success = game.makeMove(index, mark);
    if (success) {
      tttNamespace.to('lobby').emit('gameState', {
        board: game.board,
        currentPlayer: game.currentPlayer,
        winner: game.winner
      });
    }
  });

  socket.on('reset', () => {
    game.reset();
    tttNamespace.to('lobby').emit('gameState', {
      board: game.board,
      currentPlayer: game.currentPlayer,
      winner: game.winner
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    players.delete(socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("GamesHub API is running");
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
