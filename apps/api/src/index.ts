import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { TicTacToeLogic, PlayerMark } from "@gameshub/tic-tac-toe";
import { RPSLogic, RPSChoice } from "@gameshub/rock-paper-scissors";
import { GuessTheFlagLogic, GTFCountry } from "@gameshub/guess-the-flag";
import { randomUUID } from "crypto";

// Load countries
let allCountries: GTFCountry[] = [];
async function loadCountries() {
  try {
    const res = await fetch("https://restcountries.com/v3.1/all?fields=name,flags,region");
    const data = await res.json();
    allCountries = data.map((c: any) => ({
      name: c.name.common,
      flagUrl: c.flags.svg || c.flags.png,
      region: c.region || "Unknown"
    }));
    console.log(`Loaded ${allCountries.length} countries for Guess the Flag`);
  } catch (error) {
    console.error("Failed to load countries:", error);
  }
}
loadCountries();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

interface QueueEntry {
  socketId: string;
  config: any;
}
const matchQueue = new Map<string, QueueEntry[]>(); // gameId -> QueueEntry[]

function joinQueue(socket: Socket, gameId: string, config: any, namespace: ReturnType<typeof io.of>, createGameCallback: (roomId: string, config: any) => void) {
  if (!matchQueue.has(gameId)) matchQueue.set(gameId, []);
  
  const queue = matchQueue.get(gameId)!;
  if (!queue.find(q => q.socketId === socket.id)) {
    queue.push({ socketId: socket.id, config });
    console.log(`[Queue] ${socket.id} joined ${gameId} queue. Waiting: ${queue.length}`);
  }

  if (queue.length >= 2) {
    const p1Entry = queue.shift()!;
    const p2Entry = queue.shift()!;
    const roomId = randomUUID();
    
    // Initialize game state specific to this room using p1 config (Host)
    createGameCallback(roomId, p1Entry.config);

    // Get socket instances
    const p1Socket = namespace.sockets.get(p1Entry.socketId);
    const p2Socket = namespace.sockets.get(p2Entry.socketId);

    if (p1Socket && p2Socket) {
      p1Socket.join(roomId);
      p2Socket.join(roomId);
      
      namespace.to(roomId).emit('matchFound', { roomId });
      console.log(`[Matchmaking] Room ${roomId} created for ${p1Entry.socketId} and ${p2Entry.socketId}`);
    }
  }
}

function leaveQueue(socketId: string) {
  for (const [gameId, queue] of matchQueue.entries()) {
    const index = queue.findIndex(q => q.socketId === socketId);
    if (index !== -1) {
      queue.splice(index, 1);
      console.log(`[Queue] ${socketId} left ${gameId} queue.`);
    }
  }
}

const tttNamespace = io.of('/ttt');
const tttGames = new Map<string, TicTacToeLogic>();
const tttSocketRooms = new Map<string, string>();

tttNamespace.on('connection', (socket: Socket) => {
  console.log('A user connected to Tic-Tac-Toe:', socket.id);
  
  socket.on('checkQueue', (callback: (hasPending: boolean) => void) => {
    const queue = matchQueue.get('ttt');
    callback(queue ? queue.length > 0 : false);
  });

  socket.on('joinMatchmaking', (config?: any) => {
    joinQueue(socket, 'ttt', config || {}, tttNamespace, (roomId, hostConfig) => {
      // Pass host config to logic
      tttGames.set(roomId, new TicTacToeLogic(hostConfig));
    });
  });

  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
    const game = tttGames.get(roomId);
    if (!game) return;

    tttSocketRooms.set(socket.id, roomId);
    game.addPlayer(socket.id);

    const roomClients = tttNamespace.adapter.rooms.get(roomId);
    if (roomClients?.size === 1) {
      socket.emit('waitingForOpponent');
    } else if (roomClients?.size === 2) {
      // Both are here, send state to each with their mark
      for (const clientId of roomClients) {
        const clientSocket = tttNamespace.sockets.get(clientId);
        if (clientSocket) {
          clientSocket.emit('gameState', {
            ...game.getPublicState(),
            yourMark: game.players.get(clientId)
          });
        }
      }
    }
  });

  socket.on('makeMove', ({ roomId, index }: { roomId: string, index: number }) => {
    const game = tttGames.get(roomId);
    if (!game) return;

    if (game.makeMove(socket.id, index)) {
      tttNamespace.to(roomId).emit('gameState', game.getPublicState());
    }
  });

  socket.on('requestRematch', (roomId: string) => {
    const game = tttGames.get(roomId);
    if (!game) return;

    if (game.requestRematch(socket.id)) {
      // Both want a rematch!
      game.reset();
      tttNamespace.to(roomId).emit('rematchStarted');
      tttNamespace.to(roomId).emit('gameState', {
        ...game.getPublicState(),
        yourMark: null // Tell clients to reuse their known marks if they want, but here we just broad cast public state
      });
      // Actually we should re-emit properly
      const roomClients = tttNamespace.adapter.rooms.get(roomId);
      if (roomClients) {
        for (const clientId of roomClients) {
          const clientSocket = tttNamespace.sockets.get(clientId);
          if (clientSocket) {
            clientSocket.emit('gameState', {
              ...game.getPublicState(),
              yourMark: game.players.get(clientId)
            });
          }
        }
      }
    } else {
      // Just one so far
      tttNamespace.to(roomId).emit('gameState', game.getPublicState());
    }
  });

  socket.on('leaveRoom', (roomId: string) => {
    const game = tttGames.get(roomId);
    if (game) {
      game.removePlayer(socket.id);
      socket.leave(roomId);
      tttSocketRooms.delete(socket.id);
      tttNamespace.to(roomId).emit('opponentDisconnected');
      tttGames.delete(roomId);
    }
  });

  socket.on('disconnect', () => {
    leaveQueue(socket.id);

    const roomId = tttSocketRooms.get(socket.id);
    if (roomId) {
      const game = tttGames.get(roomId);
      if (game) {
        game.removePlayer(socket.id);
      }
      tttSocketRooms.delete(socket.id);
      tttNamespace.to(roomId).emit('opponentDisconnected');
      tttGames.delete(roomId);
    }
  });
});

// --- Rock-Paper-Scissors Namespace ---
const rpsNamespace = io.of('/rps');
const rpsGames = new Map<string, RPSLogic>();

rpsNamespace.on('connection', (socket: Socket) => {
  console.log('A user connected to Rock-Paper-Scissors:', socket.id);

  socket.on('checkQueue', (callback: (hasPending: boolean) => void) => {
    const queue = matchQueue.get('rps');
    callback(queue ? queue.length > 0 : false);
  });

  socket.on('joinMatchmaking', (config?: any) => {
    joinQueue(socket, 'rps', config || {}, rpsNamespace, (roomId, hostConfig) => {
      rpsGames.set(roomId, new RPSLogic(hostConfig?.maxRounds || 3, hostConfig));
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

  socket.on('requestRematch', (roomId: string) => {
    const game = rpsGames.get(roomId);
    if (!game) return;

    if (game.requestRematch(socket.id)) {
      game.reset();
      rpsNamespace.to(roomId).emit('rematchStarted');
      rpsNamespace.to(roomId).emit('gameState', game.getPublicState());
    } else {
      rpsNamespace.to(roomId).emit('gameState', game.getPublicState());
    }
  });

  socket.on('leaveRoom', (roomId: string) => {
    const game = rpsGames.get(roomId);
    if (game) {
      game.removePlayer(socket.id);
      socket.leave(roomId);
      rpsNamespace.to(roomId).emit('opponentDisconnected');
      rpsGames.delete(roomId);
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

// --- Guess the Flag Namespace ---
const gtfNamespace = io.of('/gtf');
const gtfGames = new Map<string, GuessTheFlagLogic>();

gtfNamespace.on('connection', (socket: Socket) => {
  console.log('A user connected to Guess the Flag:', socket.id);

  socket.on('checkQueue', (callback: (hasPending: boolean) => void) => {
    const queue = matchQueue.get('gtf');
    callback(queue ? queue.length > 0 : false);
  });

  socket.on('joinMatchmaking', (config?: any) => {
    joinQueue(socket, 'gtf', config || {}, gtfNamespace, (roomId, hostConfig) => {
      gtfGames.set(roomId, new GuessTheFlagLogic(hostConfig?.maxRounds || 5, hostConfig));
    });
  });

  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
    const game = gtfGames.get(roomId);
    if (!game) return;

    game.addPlayer(socket.id);
    gtfNamespace.to(roomId).emit('gameState', game.getPublicState());

    // When 2 players join, state becomes guessing_phase. Start a round.
    if (game.state === 'guessing_phase' && game.players.size === 2 && !game.currentCountry) {
      startGTFRound(roomId, game);
    }
  });

  socket.on('submitGuess', ({ roomId, guess }: { roomId: string, guess: string }) => {
    const game = gtfGames.get(roomId);
    if (!game) return;

    if (game.submitGuess(socket.id, guess)) {
      gtfNamespace.to(roomId).emit('gameState', game.getPublicState());

      if (game.state === 'round_result') {
        setTimeout(() => {
          game.nextRound();
          if (game.state === 'guessing_phase') {
            startGTFRound(roomId, game);
          } else if (game.state === 'game_over') {
            gtfNamespace.to(roomId).emit('gameState', game.getPublicState());
          }
        }, 5000); // 5 second break between rounds
      }
    }
  });

  socket.on('requestRematch', (roomId: string) => {
    const game = gtfGames.get(roomId);
    if (!game) return;

    if (game.requestRematch(socket.id)) {
      game.reset();
      gtfNamespace.to(roomId).emit('rematchStarted');
      startGTFRound(roomId, game); // Start new round automatically
    } else {
      gtfNamespace.to(roomId).emit('gameState', game.getPublicState());
    }
  });

  socket.on('leaveRoom', (roomId: string) => {
    const game = gtfGames.get(roomId);
    if (game) {
      game.removePlayer(socket.id);
      socket.leave(roomId);
      gtfNamespace.to(roomId).emit('opponentDisconnected');
      gtfGames.delete(roomId);
    }
  });

  socket.on('disconnect', () => {
    leaveQueue(socket.id);
    for (const [roomId, game] of gtfGames.entries()) {
      if (game.players.has(socket.id)) {
        game.removePlayer(socket.id);
        gtfNamespace.to(roomId).emit('opponentDisconnected');
        gtfGames.delete(roomId);
      }
    }
  });
});

function startGTFRound(roomId: string, game: GuessTheFlagLogic) {
  let pool = allCountries;
  if (game.region && game.region !== 'All') {
    pool = allCountries.filter(c => c.region === game.region);
  }
  
  if (pool.length < 4) {
    // Fallback if region is too small
    pool = allCountries;
  }
  
  // Pick 4 random distinct countries
  const options: GTFCountry[] = [];
  while (options.length < 4) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) continue;
    if (!options.find((o) => o.name === pick.name)) {
      options.push(pick);
    }
  }

  // Pick one as the correct answer
  const correct = options[Math.floor(Math.random() * options.length)];
  if (!correct) return;
  
  game.startRound(correct, options.map(o => o.name));
  gtfNamespace.to(roomId).emit('gameState', game.getPublicState());
}

// Global Matchmaking Game Loop Enforcer
setInterval(() => {
  const now = Date.now();
  
  // Check TicTacToe
  for (const [roomId, game] of tttGames.entries()) {
    if (game.turnEndTime && now >= game.turnEndTime && !game.winner) {
      const emptyIndices = game.board.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
      if (emptyIndices.length > 0) {
        const randomObj = emptyIndices[Math.floor(Math.random() * emptyIndices.length)] as number;
        const currentPlayerId = Array.from(game.players.entries()).find(([id, mark]) => mark === game.currentPlayer)?.[0];
        if (currentPlayerId) {
          game.makeMove(currentPlayerId, randomObj);
          tttNamespace.to(roomId).emit('gameState', game.getPublicState());
        }
      }
    }
  }

  // Check RPS
  for (const [roomId, game] of rpsGames.entries()) {
    if (game.state === 'commit_phase' && game.turnEndTime && now >= game.turnEndTime) {
      let changed = false;
      for (const [playerId, player] of game.players.entries()) {
        if (!player.hasCommitted) {
          game.commitChoice(playerId, ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)] as RPSChoice);
          changed = true;
        }
      }
      if (changed) {
        rpsNamespace.to(roomId).emit('gameState', game.getPublicState());
        if ((game as any).state === 'reveal_phase') {
          setTimeout(() => {
            game.nextRound();
            if ((game as any).state === 'commit_phase') game.beginCommitPhase();
            rpsNamespace.to(roomId).emit('gameState', game.getPublicState());
          }, 3000);
        }
      }
    }
  }

  // Check GTF
  for (const [roomId, game] of gtfGames.entries()) {
    if (game.state === 'guessing_phase' && game.turnEndTime && now >= game.turnEndTime) {
      game.timeoutRound();
      gtfNamespace.to(roomId).emit('gameState', game.getPublicState());
      
      setTimeout(() => {
        game.nextRound();
        if ((game as any).state === 'guessing_phase') {
          startGTFRound(roomId, game);
        } else if ((game as any).state === 'game_over') {
          gtfNamespace.to(roomId).emit('gameState', game.getPublicState());
        }
      }, 5000);
    }
  }
}, 1000);

app.get("/", (req, res) => {
  res.send("GamesHub API is running");
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
