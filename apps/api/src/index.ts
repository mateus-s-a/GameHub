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

const FALLBACK_COUNTRIES: GTFCountry[] = [
  { name: "Brazil", flagUrl: "https://flagcdn.com/w320/br.png", region: "Americas" },
  { name: "France", flagUrl: "https://flagcdn.com/w320/fr.png", region: "Europe" },
  { name: "Japan", flagUrl: "https://flagcdn.com/w320/jp.png", region: "Asia" },
  { name: "Germany", flagUrl: "https://flagcdn.com/w320/de.png", region: "Europe" },
  { name: "Canada", flagUrl: "https://flagcdn.com/w320/ca.png", region: "Americas" },
  { name: "Australia", flagUrl: "https://flagcdn.com/w320/au.png", region: "Oceania" },
  { name: "Argentina", flagUrl: "https://flagcdn.com/w320/ar.png", region: "Americas" },
  { name: "Italy", flagUrl: "https://flagcdn.com/w320/it.png", region: "Europe" },
  { name: "Spain", flagUrl: "https://flagcdn.com/w320/es.png", region: "Europe" },
  { name: "United Kingdom", flagUrl: "https://flagcdn.com/w320/gb.png", region: "Europe" },
  { name: "United States", flagUrl: "https://flagcdn.com/w320/us.png", region: "Americas" },
  { name: "South Korea", flagUrl: "https://flagcdn.com/w320/kr.png", region: "Asia" },
  { name: "Mexico", flagUrl: "https://flagcdn.com/w320/mx.png", region: "Americas" },
  { name: "South Africa", flagUrl: "https://flagcdn.com/w320/za.png", region: "Africa" },
  { name: "Egypt", flagUrl: "https://flagcdn.com/w320/eg.png", region: "Africa" },
  { name: "India", flagUrl: "https://flagcdn.com/w320/in.png", region: "Asia" },
  { name: "China", flagUrl: "https://flagcdn.com/w320/cn.png", region: "Asia" },
  { name: "Portugal", flagUrl: "https://flagcdn.com/w320/pt.png", region: "Europe" },
  { name: "Netherlands", flagUrl: "https://flagcdn.com/w320/nl.png", region: "Europe" },
  { name: "Greece", flagUrl: "https://flagcdn.com/w320/gr.png", region: "Europe" },
];

// Load countries
let allCountries: GTFCountry[] = [];
const countriesByRegionMap = new Map<string, GTFCountry[]>();

function applyFallbackCountries() {
  allCountries = [...FALLBACK_COUNTRIES];
  countriesByRegionMap.clear();
  for (const country of allCountries) {
    const regionList = countriesByRegionMap.get(country.region) || [];
    regionList.push(country);
    countriesByRegionMap.set(country.region, regionList);
  }
  console.log(`Using ${allCountries.length} fallback countries for Guess the Flag`);
}

/**
 * REST Countries API v5 — loadCountries()
 *
 * Schema v5 key differences from legacy v3.1:
 *   - Response:    { data: [...], "data.meta": { total, count, more, offset } }
 *   - Name field:  c.names.common  (NOT c.name.common as in v3.1)
 *   - Flag field:  c.flags.png     (unchanged)
 *   - Auth:        Authorization: Bearer <API_KEY>  (mandatory)
 *   - Pagination:  limit (max 100 free / 500 paid) + offset; iterate via data.meta.more
 *
 * Strategy:
 *   1. Paginate with limit=100 until data.meta.more === false (handles ~250 countries).
 *   2. Map v5 field names to GTFCountry interface.
 *   3. Filter out countries with no usable flag URL (unplayable in GTF).
 *   4. On HTTP errors (401/403/429/5xx) or network failures → applyFallbackCountries().
 */
async function loadCountries() {
  const baseUrl =
    process.env.REST_COUNTRIES_API_URL ||
    "https://api.restcountries.com/countries/v5";
  const apiKey = process.env.REST_COUNTRIES_API_KEY || "rc_live_demo";

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accumulated: any[] = [];
  const PAGE_LIMIT = 100; // max per page on free plan
  let offset = 0;
  let hasMore = true;
  let pagesFetched = 0;

  try {
    while (hasMore) {
      const url = `${baseUrl}?limit=${PAGE_LIMIT}&offset=${offset}`;
      const res = await fetch(url, { headers });

      if (!res.ok) {
        const statusCode = res.status;
        if (statusCode === 401) {
          console.error(
            "[GTF] REST Countries v5: 401 Unauthorized — API key is missing, expired or incorrect.",
          );
        } else if (statusCode === 403) {
          console.error(
            "[GTF] REST Countries v5: 403 Forbidden — Monthly quota exceeded or restricted access.",
          );
        } else if (statusCode === 429) {
          console.warn(
            "[GTF] REST Countries v5: 429 Too Many Requests — Cloudflare rate limit reached. Applying fallback.",
          );
        } else {
          console.error(
            `[GTF] REST Countries v5: HTTP ${statusCode} error. Applying fallback.`,
          );
        }
        applyFallbackCountries();
        return;
      }

      const json = await res.json();

      // v5 response shape: { data: [...], "data.meta": { total, count, more, offset } }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page: any[] = Array.isArray(json?.data) ? json.data : [];
      const meta = json?.["data.meta"] ?? null;

      accumulated.push(...page);
      pagesFetched++;

      // Paginate only if explicitly told more pages exist and we got a full page
      hasMore = meta?.more === true && page.length === PAGE_LIMIT;
      offset += page.length;

      // Safety cap: stop after 10 pages (1000 countries max) to prevent runaway loops
      if (pagesFetched >= 10) {
        if (hasMore) {
          console.warn("[GTF] REST Countries v5: Reached 10-page safety cap. Stopping pagination.");
        }
        hasMore = false;
      }
    }

    if (accumulated.length < 10) {
      console.warn(
        `[GTF] REST Countries v5: Only ${accumulated.length} countries received (minimum 10 needed). Applying fallback.`,
      );
      applyFallbackCountries();
      return;
    }

    // Map v5 schema to GTFCountry.
    // v5 name field: c.names.common (v3.1 was c.name.common)
    // Flag CDN fallback via codes.alpha_2 if flags.png is missing
    const mapped: GTFCountry[] = accumulated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => ({
        name: c.names?.common || c.name?.common || String(c.name ?? ""),
        flagUrl:
          c.flags?.png ||
          c.flags?.svg ||
          (c.codes?.alpha_2
            ? `https://flagcdn.com/w320/${(c.codes.alpha_2 as string).toLowerCase()}.png`
            : ""),
        region: c.region || "Unknown",
      }))
      // Exclude countries unplayable in GTF (missing name or flag)
      .filter((c) => c.name.trim().length > 0 && c.flagUrl.trim().length > 0);

    if (mapped.length < 10) {
      console.warn(
        `[GTF] REST Countries v5: Only ${mapped.length} valid GTF-playable countries after filtering. Applying fallback.`,
      );
      applyFallbackCountries();
      return;
    }

    allCountries = mapped;
    countriesByRegionMap.clear();
    for (const country of allCountries) {
      const regionList = countriesByRegionMap.get(country.region) || [];
      regionList.push(country);
      countriesByRegionMap.set(country.region, regionList);
    }

    console.log(
      `[GTF] Loaded ${allCountries.length} playable countries in ${pagesFetched} page(s) from REST Countries API v5.`,
    );
  } catch (error) {
    console.error(
      "[GTF] Failed to fetch from REST Countries API v5. Applying fallback:",
      error,
    );
    applyFallbackCountries();
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

      // Auto-return to lobby logic (Project-wide root logic)
      if (game.state === "game_over") {
        handleAutoReturnToLobby(namespace, roomId, gameMap);
      }

      if (onNextRound) {
        onNextRound(game);
      } else {
        namespace.to(roomId).emit("gameState", game.getPublicState());
      }
    }
  }, delayMs);
}

import {
  registerGenericLobbyEvents,
  handleAutoReturnToLobby,
  cancelAutoReturnToLobby,
} from "./LobbyEvents";
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
        } else if (game.state === "game_over") {
          handleAutoReturnToLobby(tttNamespace, roomId, tttGames);
        }
      }
    },
  );

  socket.on("requestRematch", (roomId: string) => {
    const game = tttGames.get(roomId);
    if (!game) return;

    if (game.requestRematch(socket.id)) {
      // Both want a rematch!
      cancelAutoReturnToLobby(roomId);
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
      cancelAutoReturnToLobby(roomId);
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
      cancelAutoReturnToLobby(roomId);
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
    const regional = countriesByRegionMap.get(game.region);
    if (regional && regional.length >= 4) {
      pool = regional;
    }
  }

  if (!pool || pool.length < 4) {
    pool = allCountries.length >= 4 ? allCountries : FALLBACK_COUNTRIES;
  }

  // Pick 4 random distinct countries with safety limit on attempts
  const options: GTFCountry[] = [];
  const selectedNames = new Set<string>();
  let attempts = 0;
  const maxAttempts = 100;

  while (options.length < 4 && attempts < maxAttempts) {
    attempts++;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick && !selectedNames.has(pick.name)) {
      selectedNames.add(pick.name);
      options.push(pick);
    }
  }

  // Emergency fallback if options could not reach 4
  while (options.length < 4) {
    const fallbackPick =
      FALLBACK_COUNTRIES[options.length % FALLBACK_COUNTRIES.length]!;
    if (!selectedNames.has(fallbackPick.name)) {
      selectedNames.add(fallbackPick.name);
      options.push(fallbackPick);
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
      const emptyIndices: number[] = [];
      for (let i = 0; i < game.board.length; i++) {
        if (game.board[i] === null) {
          emptyIndices.push(i);
        }
      }
      if (emptyIndices.length > 0) {
        const randomObj = emptyIndices[
          Math.floor(Math.random() * emptyIndices.length)
        ] as number;
        let currentPlayerId: string | undefined;
        for (const [id, mark] of game.players.entries()) {
          if (mark === game.currentPlayer) {
            currentPlayerId = id;
            break;
          }
        }
        if (currentPlayerId) {
          game.makeMove(currentPlayerId, randomObj);
          tttNamespace.to(roomId).emit("gameState", game.getPublicState());
          if (game.state === "round_result") {
            scheduleNextRound(tttGames, roomId, tttNamespace, 3000);
          } else if (game.state === "game_over") {
            handleAutoReturnToLobby(tttNamespace, roomId, tttGames);
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
