import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { TicTacToeLogic, PlayerMark } from "@gameshub/tic-tac-toe";
import { RPSLogic, RPSChoice } from "@gameshub/rock-paper-scissors";
import { randomUUID } from "crypto";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// --- Matchmaking Queue System ---
const matchQueue = new Map<string, string[]>(); // gameId -> socketId[]

function joinQueue(socket: Socket, gameId: string, namespace: ReturnType<typeof io.of>, createGameCallback: (roomId: string) => void) {
  if (!matchQueue.has(gameId)) matchQueue.set(gameId, []);
  
  const queue = matchQueue.get(gameId)!;
  if (!queue.includes(socket.id)) {
    queue.push(socket.id);
    console.log(`[Queue] ${socket.id} joined ${gameId} queue. Waiting: ${queue.length}`);
  }

  if (queue.length >= 2) {
    const p1 = queue.shift()!;
    const p2 = queue.shift()!;
    const roomId = randomUUID();
    
    // Initialize game state specific to this room
    createGameCallback(roomId);

    // Get socket instances
    const p1Socket = namespace.sockets.get(p1);
    const p2Socket = namespace.sockets.get(p2);

    if (p1Socket && p2Socket) {
      p1Socket.join(roomId);
      p2Socket.join(roomId);
      
      namespace.to(roomId).emit('matchFound', { roomId });
      console.log(`[Matchmaking] Room ${roomId} created for ${p1} and ${p2}`);
    }
  }
}

function leaveQueue(socketId: string) {
  for (const [gameId, queue] of matchQueue.entries()) {
    const index = queue.indexOf(socketId);
    if (index !== -1) {
      queue.splice(index, 1);
      console.log(`[Queue] ${socketId} left ${gameId} queue.`);
    }
  }
}

// --- Tic-Tac-Toe Namespace ---
const tttNamespace = io.of('/ttt');
const tttGames = new Map<string, TicTacToeLogic>();
const tttPlayers = new Map<string, PlayerMark>();

tttNamespace.on('connection', (socket: Socket) => {
  console.log('A user connected to Tic-Tac-Toe:', socket.id);
  
  socket.on('joinMatchmaking', () => {
    joinQueue(socket, 'ttt', tttNamespace, (roomId) => {
      tttGames.set(roomId, new TicTacToeLogic());
    });
  });

  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
    const game = tttGames.get(roomId);
    if (!game) return;

    const roomClients = tttNamespace.adapter.rooms.get(roomId);
    if (roomClients?.size === 1) {
      tttPlayers.set(socket.id, 'X');
    } else {
      tttPlayers.set(socket.id, 'O');
    }

    socket.emit('gameState', {
      board: game.board,
      currentPlayer: game.currentPlayer,
      winner: game.winner,
      yourMark: tttPlayers.get(socket.id)
    });
  });

  socket.on('makeMove', ({ roomId, index }: { roomId: string, index: number }) => {
    const game = tttGames.get(roomId);
    const mark = tttPlayers.get(socket.id);
    if (!game || !mark) return;

    if (game.makeMove(index, mark)) {
      tttNamespace.to(roomId).emit('gameState', {
        board: game.board,
        currentPlayer: game.currentPlayer,
        winner: game.winner
      });
    }
  });

  socket.on('disconnect', () => {
    leaveQueue(socket.id);
    tttPlayers.delete(socket.id);
  });
});

// --- Rock-Paper-Scissors Namespace ---
const rpsNamespace = io.of('/rps');
const rpsGames = new Map<string, RPSLogic>();

rpsNamespace.on('connection', (socket: Socket) => {
  console.log('A user connected to Rock-Paper-Scissors:', socket.id);

  socket.on('joinMatchmaking', () => {
    joinQueue(socket, 'rps', rpsNamespace, (roomId) => {
      rpsGames.set(roomId, new RPSLogic(3));
    });
  });

  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
    const game = rpsGames.get(roomId);
    if (!game) return;

    game.addPlayer(socket.id);
    rpsNamespace.to(roomId).emit('gameState', game.getPublicState());
  });

  socket.on('commitChoice', ({ roomId, choice }: { roomId: string, choice: RPSChoice }) => {
    const game = rpsGames.get(roomId);
    if (!game) return;

    if (game.commitChoice(socket.id, choice)) {
      // Broadcast state - note that choices are hidden if in commit_phase
      rpsNamespace.to(roomId).emit('gameState', game.getPublicState());

      // If the round just finished, wait 3 seconds and go to next round automatically
      if (game.state === 'reveal_phase') {
        setTimeout(() => {
          game.nextRound();
          rpsNamespace.to(roomId).emit('gameState', game.getPublicState());
        }, 3000);
      }
    }
  });

  socket.on('disconnect', () => {
    leaveQueue(socket.id);
    
    // Quick cleanup for MVP - notify opponent and delete game
    for (const [roomId, game] of rpsGames.entries()) {
      if (game.players.has(socket.id)) {
        game.removePlayer(socket.id);
        rpsNamespace.to(roomId).emit('opponentDisconnected');
        rpsGames.delete(roomId);
      }
    }
  });
});

app.get("/", (req, res) => {
  res.send("GamesHub API is running");
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
