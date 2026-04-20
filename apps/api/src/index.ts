import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { TicTacToeLogic } from "@gamehub/tic-tac-toe";
import { RPSLogic, RPSChoice } from "@gamehub/rock-paper-scissors";
import { GuessTheFlagLogic, GTFCountry } from "@gamehub/guess-the-flag";
import { WordService } from "@gamehub/hangman";
import { HangmanController } from "./controllers/HangmanController";
import { GameEvent } from "@gamehub/core";

// Initialize word buffer
WordService.init();

// Load countries
let allCountries: GTFCountry[] = [];
async function loadCountries() {
  try {
    const res = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,flags,region",
    );
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allCountries = data.map((c: any) => ({
      name: c.name.common,
      flagUrl: c.flags.svg || c.flags.png,
      region: c.region || "Unknown",
    }));
    console.log(`Loaded ${allCountries.length} countries for Guess the Flag`);
  } catch (error) {
    console.error("Failed to load countries:", error);
  }
}
loadCountries();

const app = express();

/**
 * Dynamic CORS configuration.
 * - If CORS_ORIGIN is set, it allows only those origins (comma-separated).
 * - If CORS_ORIGIN is not set, it reflects the requesting origin (allows all).
 * This prevents the common "origin mismatch" error when deploying to Render,
 * where service URLs may have unpredictable suffixes.
 */
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : null;

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (server-to-server, curl, health checks)
    if (!origin) return callback(null, true);
    // If no CORS_ORIGIN is set, allow everything (dev / open API)
    if (!allowedOrigins) return callback(null, true);
    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Reject
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ["GET", "POST"],
  credentials: true,
};

app.use(cors(corsOptions));

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

/**
 * Universal utility to progress match rounds after a set delay.
 */
function scheduleNextRound(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gameMap: Map<string, any>,
  roomId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  namespace: any,
  delayMs: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onNextRound?: (game: any) => void,
) {
  setTimeout(() => {
    const game = gameMap.get(roomId);
    if (game) {
      game.nextRound();
      if (onNextRound) {
        onNextRound(game);
      } else {
        namespace.to(roomId).emit("gameState", game.getPublicState());
      }
    }
  }, delayMs);
}

import { registerGenericLobbyEvents } from "./LobbyEvents";
import { roomManager } from "./RoomManager";
import { renderDashboard } from "./views/dashboard";

const loggedSessions = new Set<string>();
function logConnection(socket: Socket, gameName: string) {
  const sessionId = socket.handshake.auth.sessionId;
  const logKey = `${gameName}:${sessionId || socket.id}`;

  if (!loggedSessions.has(logKey)) {
    console.log(
      `[GameHub-API] User connected to ${gameName} (Socket: ${socket.id.substring(0, 5)})`,
    );
    loggedSessions.add(logKey);

    setTimeout(() => loggedSessions.delete(logKey), 5000);
  }
}

io.on("connection", (socket: Socket) => {
  const sessionId = socket.handshake.auth.sessionId;
  console.log(
    `[GameHub-API] Transport connection established: ${socket.id.substring(0, 5)} (Session: ${sessionId?.substring(0, 5) || "N/A"})`,
  );

  socket.on("disconnect", (reason) => {
    console.log(
      `[GameHub-API] Transport disconnected: ${socket.id.substring(0, 5)} (${reason})`,
    );
  });
});

const tttNamespace = io.of("/ttt");
const tttGames = new Map<string, TicTacToeLogic>();
const tttSocketRooms = new Map<string, string>();

tttNamespace.on("connection", (socket: Socket) => {
  logConnection(socket, "Tic-Tac-Toe");

  registerGenericLobbyEvents(
    socket,
    tttNamespace,
    "ttt",
    tttGames,
    (config) => new TicTacToeLogic(config || {}),
    (socketId) => tttSocketRooms.delete(socketId),
  );

  socket.on("joinRoom", (roomId: string) => {
    socket.join(roomId);
    const game = tttGames.get(roomId);
    if (!game) return;

    tttSocketRooms.set(socket.id, roomId);
    game.addPlayer(socket.id);

    const roomClients = tttNamespace.adapter.rooms.get(roomId);
    if (roomClients?.size === 1) {
      socket.emit("waitingForOpponent");
    } else if (roomClients?.size === 2) {
      // Both are here, send state to each with their mark
      for (const clientId of roomClients) {
        const clientSocket = tttNamespace.sockets.get(clientId);
        if (clientSocket) {
          clientSocket.emit("gameState", {
            ...game.getPublicState(),
            yourMark: game.players.get(clientId),
          });
        }
      }
    }
  });

  socket.on(
    "makeMove",
    ({ roomId, index }: { roomId: string; index: number }) => {
      const game = tttGames.get(roomId);
      if (!game) return;

      if (game.makeMove(socket.id, index)) {
        tttNamespace.to(roomId).emit("gameState", game.getPublicState());
        if (game.state === "round_result") {
          scheduleNextRound(tttGames, roomId, tttNamespace, 3000);
        }
      }
    },
  );

  socket.on("requestRematch", (roomId: string) => {
    const game = tttGames.get(roomId);
    if (!game) return;

    if (game.requestRematch(socket.id)) {
      // Both want a rematch!
      game.reset();
      tttNamespace.to(roomId).emit("rematchStarted");
      tttNamespace.to(roomId).emit("gameState", {
        ...game.getPublicState(),
        yourMark: null, // Tell clients to reuse their known marks if they want, but here we just broad cast public state
      });
      // Actually we should re-emit properly
      const roomClients = tttNamespace.adapter.rooms.get(roomId);
      if (roomClients) {
        for (const clientId of roomClients) {
          const clientSocket = tttNamespace.sockets.get(clientId);
          if (clientSocket) {
            clientSocket.emit("gameState", {
              ...game.getPublicState(),
              yourMark: game.players.get(clientId),
            });
          }
        }
      }
    } else {
      // Just one so far
      tttNamespace.to(roomId).emit("gameState", game.getPublicState());
    }
  });

  // Rematch and Move events stay the same.
});

// --- Rock-Paper-Scissors Namespace ---
const rpsNamespace = io.of("/rps");
const rpsGames = new Map<string, RPSLogic>();

rpsNamespace.on("connection", (socket: Socket) => {
  logConnection(socket, "Rock-Paper-Scissors");

  registerGenericLobbyEvents(
    socket,
    rpsNamespace,
    "rps",
    rpsGames,
    (config) => new RPSLogic(config?.maxRounds || 3, config),
  );

  socket.on("joinRoom", (roomId: string) => {
    socket.join(roomId);
    const game = rpsGames.get(roomId);
    if (!game) return;

    game.addPlayer(socket.id);
    rpsNamespace.to(roomId).emit("gameState", game.getPublicState());
  });

  socket.on(
    "commitChoice",
    ({ roomId, choice }: { roomId: string; choice: RPSChoice }) => {
      const game = rpsGames.get(roomId);
      if (!game) return;

      if (game.commitChoice(socket.id, choice)) {
        // Broadcast state - note that choices are hidden if in commit_phase
        rpsNamespace.to(roomId).emit("gameState", game.getPublicState());

        // If the round just finished, wait 3 seconds and go to next round automatically
        if (game.state === "reveal_phase") {
          scheduleNextRound(rpsGames, roomId, rpsNamespace, 3000);
        }
      }
    },
  );

  socket.on("requestRematch", (roomId: string) => {
    const game = rpsGames.get(roomId);
    if (!game) return;

    if (game.requestRematch(socket.id)) {
      game.reset();
      rpsNamespace.to(roomId).emit("rematchStarted");
      rpsNamespace.to(roomId).emit("gameState", game.getPublicState());
    } else {
      rpsNamespace.to(roomId).emit("gameState", game.getPublicState());
    }
  });

  // Rematch and Move events stay the same
});

// --- Guess the Flag Namespace ---
const gtfNamespace = io.of("/gtf");
const gtfGames = new Map<string, GuessTheFlagLogic>();

gtfNamespace.on("connection", (socket: Socket) => {
  logConnection(socket, "Guess the Flag");

  registerGenericLobbyEvents(
    socket,
    gtfNamespace,
    "gtf",
    gtfGames,
    (config) => new GuessTheFlagLogic(config?.maxRounds || 5, config),
    undefined,
    (roomId, game) => {
      startGTFRound(roomId, game);
    },
  );

  socket.on("joinRoom", (roomId: string) => {
    socket.join(roomId);
    const game = gtfGames.get(roomId);
    if (!game) return;

    game.addPlayer(socket.id);
    gtfNamespace.to(roomId).emit("gameState", game.getPublicState());
  });

  socket.on(
    "submitGuess",
    ({ roomId, guess }: { roomId: string; guess: string }) => {
      const game = gtfGames.get(roomId);
      if (!game) return;

      if (game.submitGuess(socket.id, guess)) {
        gtfNamespace.to(roomId).emit("gameState", game.getPublicState());

        if (game.state === "round_result") {
          scheduleNextRound(gtfGames, roomId, gtfNamespace, 5000, (g) => {
            if (g.state === "guessing_phase") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              startGTFRound(roomId, g as any);
            } else if (g.state === "game_over") {
              gtfNamespace.to(roomId).emit("gameState", g.getPublicState());
            }
          });
        }
      }
    },
  );

  socket.on("requestRematch", (roomId: string) => {
    const game = gtfGames.get(roomId);
    if (!game) return;

    if (game.requestRematch(socket.id)) {
      game.reset();
      gtfNamespace.to(roomId).emit("rematchStarted");
      startGTFRound(roomId, game); // Start new round automatically
    } else {
      gtfNamespace.to(roomId).emit("gameState", game.getPublicState());
    }
  });

  // Rematch and Submit events stay the same
});

// --- Hangman Namespace ---
const hangmanNamespace = io.of("/hangman");
const hangmanController = new HangmanController(hangmanNamespace);

hangmanNamespace.on("connection", (socket: Socket) => {
  logConnection(socket, "Hangman");

  registerGenericLobbyEvents(
    socket,
    hangmanNamespace,
    "hangman",
    new Map(), // Placeholder map for LobbyEvents compatibility
    () => ({}), // Truthy placeholder — actual logic lives in HangmanController
    undefined,
    (roomId: string) => {
      const room = roomManager.getRoom(roomId);
      if (room) {
        hangmanController.initGame(
          roomId,
          room.players.map((p) => p.id),
          room.config,
        );
      }
    },
  );

  socket.on(GameEvent.JOIN_ROOM, (roomId: string) => {
    socket.join(roomId);
  });

  socket.on(
    GameEvent.GAME_MOVE,
    ({ roomId, action }: { roomId: string; action: any }) => {
      hangmanController.handleMove(socket, roomId, action);
    },
  );

  socket.on("requestRematch", (roomId: string) => {
    hangmanController.handleRematch(socket.id, roomId);
  });
});

function startGTFRound(roomId: string, game: GuessTheFlagLogic) {
  let pool = allCountries;
  if (game.region && game.region !== "All") {
    pool = allCountries.filter((c) => c.region === game.region);
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

  game.startRound(
    correct,
    options.map((o) => o.name),
  );
  gtfNamespace.to(roomId).emit("gameState", game.getPublicState());
}

// Global Matchmaking Game Loop Enforcer
setInterval(() => {
  const now = Date.now();

  // Check TicTacToe
  for (const [roomId, game] of tttGames.entries()) {
    if (game.turnEndTime && now >= game.turnEndTime && !game.winner) {
      const emptyIndices = game.board
        .map((v, i) => (v === null ? i : -1))
        .filter((i) => i !== -1);
      if (emptyIndices.length > 0) {
        const randomObj = emptyIndices[
          Math.floor(Math.random() * emptyIndices.length)
        ] as number;
        const currentPlayerId = Array.from(game.players.entries()).find(
          ([, mark]) => mark === game.currentPlayer,
        )?.[0];
        if (currentPlayerId) {
          game.makeMove(currentPlayerId, randomObj);
          tttNamespace.to(roomId).emit("gameState", game.getPublicState());
          if (game.state === "round_result") {
            scheduleNextRound(tttGames, roomId, tttNamespace, 3000);
          }
        }
      }
    }
  }

  // Check RPS
  for (const [roomId, game] of rpsGames.entries()) {
    if (
      game.state === "commit_phase" &&
      game.turnEndTime &&
      now >= game.turnEndTime
    ) {
      let changed = false;
      for (const [playerId, player] of game.players.entries()) {
        if (!player.hasCommitted) {
          game.commitChoice(
            playerId,
            ["rock", "paper", "scissors"][
              Math.floor(Math.random() * 3)
            ] as RPSChoice,
          );
          changed = true;
        }
      }
      if (changed) {
        rpsNamespace.to(roomId).emit("gameState", game.getPublicState());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((game as any).state === "reveal_phase") {
          scheduleNextRound(rpsGames, roomId, rpsNamespace, 3000, (g) => {
            if (g.state === "commit_phase") g.beginCommitPhase();
            rpsNamespace.to(roomId).emit("gameState", g.getPublicState());
          });
        }
      }
    }
  }

  // Check GTF
  for (const [roomId, game] of gtfGames.entries()) {
    if (
      game.state === "guessing_phase" &&
      game.turnEndTime &&
      now >= game.turnEndTime
    ) {
      game.timeoutRound();
      gtfNamespace.to(roomId).emit("gameState", game.getPublicState());

      setTimeout(() => {
        scheduleNextRound(gtfGames, roomId, gtfNamespace, 5000, (g) => {
          if (g.state === "guessing_phase") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            startGTFRound(roomId, g as any);
          } else if (g.state === "game_over") {
            gtfNamespace.to(roomId).emit("gameState", g.getPublicState());
          }
        });
      }, 0);
    }
  }

  // Check Hangman
  hangmanController.checkTimeouts();
}, 1000);

app.get("/", (req, res) => {
  res.send(renderDashboard(roomManager.getStats()));
});

app.get("/api/stats", (req, res) => {
  res.json(roomManager.getStats());
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
