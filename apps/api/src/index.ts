import "dotenv/config";
import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { TicTacToeLogic } from "@gamehub/tic-tac-toe";
import { ConnectFourLogic } from "@gamehub/connect-four";
import { RPSLogic, RPSChoice } from "@gamehub/rock-paper-scissors";
import { GuessTheFlagLogic, GTFCountry } from "@gamehub/guess-the-flag";
import { WordService } from "@gamehub/hangman";
import { HangmanController } from "./controllers/HangmanController";
import { MemoryCardController } from "./controllers/MemoryCardController";
import { GameEvent } from "@gamehub/core";
import {
  registerGenericLobbyEvents,
  handleAutoReturnToLobby,
  cancelAutoReturnToLobby,
} from "./LobbyEvents";
import { roomManager } from "./RoomManager";
import { renderDashboard } from "./views/dashboard";
import { roomActionLock, LAG_COMPENSATION_BUFFER_MS } from "./lib/roomLock";
import { roomTimerManager } from "./lib/roomTimer";
import { setupRedisAdapter } from "./lib/redisAdapter";
import { MatchService } from "./services/matchService";
import { AuthController } from "./controllers/authController";
import {
  requireAuth,
  socketAuthMiddleware,
  AuthenticatedRequest,
} from "./middlewares/authMiddleware";
import {
  makeMoveTTTSchema,
  makeMoveC4Schema,
  commitChoiceRPSSchema,
  submitGuessGTFSchema,
  flipCardMCSchema,
  gameMoveHangmanSchema,
  validateSocketPayload,
} from "./schemas/socketSchemas";
import {
  authRateLimiter,
  apiRateLimiter,
  checkSocketRateLimit,
} from "./middlewares/rateLimiterMiddleware";


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
 * Schema v5 key differences:
 *   - Response:    { data: { objects: [...], meta: { total, count, limit, offset, more } } }
 *                  (or legacy array format { data: [...] })
 *   - Name field:  c.names.common (primary) | c.name.common (secondary)
 *   - Flag field:  c.flag.url_png | c.flags.png | c.flag.url_svg | flagcdn fallback
 *   - Auth:        Authorization: Bearer <API_KEY> (mandatory)
 *   - Pagination:  limit (max 100 free) + offset; iterate via meta.more
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
  const PAGE_LIMIT = 100;
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
            `[GTF] REST Countries v5: HTTP ${statusCode} error (${res.statusText}). Applying fallback.`,
          );
        }
        applyFallbackCountries();
        return;
      }

      const json = await res.json();

      // Flexible extraction supporting both object-wrapped and array-wrapped v5 payloads:
      // Structure A: { data: { objects: [...], meta: { total, count, limit, offset, more } } }
      // Structure B: { data: [...], meta: {...} }
      // Structure C: [...]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let page: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let meta: any = null;

      const dataField = json?.data;
      if (Array.isArray(dataField)) {
        page = dataField;
        meta = json?.meta ?? json?.["data.meta"] ?? null;
      } else if (dataField && typeof dataField === "object") {
        page = Array.isArray(dataField.objects) ? dataField.objects : [];
        meta = dataField.meta ?? json?.meta ?? null;
      } else if (Array.isArray(json)) {
        page = json;
      }

      if (page.length === 0) {
        hasMore = false;
        break;
      }

      accumulated.push(...page);
      pagesFetched++;

      // Continue pagination if more is true and page had full PAGE_LIMIT items
      hasMore = meta?.more === true && page.length === PAGE_LIMIT;
      offset += page.length;

      // Safety cap: stop after 10 pages to avoid runaway loops
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

    // Map v5 schema properties to GTFCountry:
    // Name:  c.names.common -> c.name.common -> c.name
    // Flag:  c.flag.url_png -> c.flags.png -> c.flag.url_svg -> c.flags.svg -> flagcdn fallback
    const mapped: GTFCountry[] = accumulated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => {
        const name = c.names?.common || c.name?.common || (typeof c.name === "string" ? c.name : "");
        const flagUrl =
          c.flag?.url_png ||
          c.flags?.png ||
          c.flag?.url_svg ||
          c.flags?.svg ||
          (c.codes?.alpha_2
            ? `https://flagcdn.com/w320/${String(c.codes.alpha_2).toLowerCase()}.png`
            : "");
        const region = c.region || "Unknown";
        return { name, flagUrl, region };
      })
      // Filter out invalid or incomplete country entries
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
app.use(express.json());
app.use("/api", apiRateLimiter);
app.use("/api/auth", authRateLimiter);

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
  roomTimerManager.scheduleTransition(roomId, delayMs, () => {
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
  });
}


const loggedSessions = new Set<string>();
function logConnection(socket: Socket, gameName: string) {
  const sessionId = socket.data?.sessionId || socket.handshake.auth.sessionId;
  const playerName =
    socket.data?.playerName || socket.handshake.auth.playerName;
  const logKey = `${gameName}:${sessionId || socket.id}`;

  if (!loggedSessions.has(logKey)) {
    console.log(
      `[GameHub-API] User connected to ${gameName} (Socket: ${socket.id.substring(0, 5)}, Session: ${sessionId?.substring(0, 5) || "N/A"}, Player: ${playerName || "Guest"})`,
    );
    loggedSessions.add(logKey);

    setTimeout(() => loggedSessions.delete(logKey), 5000);
  }
}

io.use(socketAuthMiddleware);

io.on("connection", (socket: Socket) => {
  const sessionId = socket.handshake.auth.sessionId;
  console.log(
    `[GameHub-API] Transport connection established: ${socket.id.substring(0, 5)} (Session: ${sessionId?.substring(0, 5) || "N/A"})`,
  );

  socket.on(
    "timeSync",
    (
      data: { clientSendTime: number },
      callback: (res: { clientSendTime: number; serverTime: number }) => void,
    ) => {
      if (typeof callback === "function") {
        callback({
          clientSendTime: data?.clientSendTime || Date.now(),
          serverTime: Date.now(),
        });
      }
    },
  );

  socket.on("latencyPing", (_clientTimestamp: number, callback: () => void) => {
    if (typeof callback === "function") {
      callback();
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(
      `[GameHub-API] Transport disconnected: ${socket.id.substring(0, 5)} (${reason})`,
    );
  });
});

const tttNamespace = io.of("/ttt");
tttNamespace.use(socketAuthMiddleware);
const tttGames = new Map<string, TicTacToeLogic>();
const tttSocketRooms = new Map<string, string>();

function scheduleTTTTurnTimeout(roomId: string) {
  const game = tttGames.get(roomId);
  if (!game || !game.turnEndTime || game.winner || game.state !== "playing") {
    roomTimerManager.clearTurnTimeout(roomId);
    return;
  }

  const targetTime = game.turnEndTime + LAG_COMPENSATION_BUFFER_MS;
  roomTimerManager.scheduleTurnTimeout(roomId, targetTime, async () => {
    if (!roomActionLock.acquireLock(roomId)) return;
    try {
      const g = tttGames.get(roomId);
      if (!g || !g.turnEndTime || g.winner || g.state !== "playing") return;
      if (Date.now() < g.turnEndTime + LAG_COMPENSATION_BUFFER_MS) return;

      const emptyIndices: number[] = [];
      for (let i = 0; i < g.board.length; i++) {
        if (g.board[i] === null) {
          emptyIndices.push(i);
        }
      }
      if (emptyIndices.length > 0) {
        const randomObj = emptyIndices[
          Math.floor(Math.random() * emptyIndices.length)
        ] as number;
        let currentPlayerId: string | undefined;
        for (const [id, mark] of g.players.entries()) {
          if (mark === g.currentPlayer) {
            currentPlayerId = id;
            break;
          }
        }
        if (currentPlayerId) {
          g.makeMove(currentPlayerId, randomObj);
          tttNamespace.to(roomId).emit("gameState", g.getPublicState());
          const tttState = g.state as string;
          if (tttState === "round_result") {
            scheduleNextRound(tttGames, roomId, tttNamespace, 3000, () => {
              scheduleTTTTurnTimeout(roomId);
            });
          } else if (tttState === "game_over") {
            handleAutoReturnToLobby(tttNamespace, roomId, tttGames);
          } else {
            scheduleTTTTurnTimeout(roomId);
          }
        }
      }
    } finally {
      roomActionLock.releaseLock(roomId);
    }
  });
}

tttNamespace.on("connection", (socket: Socket) => {
  logConnection(socket, "Tic-Tac-Toe");

  registerGenericLobbyEvents(
    socket,
    tttNamespace,
    "ttt",
    tttGames,
    (config) => new TicTacToeLogic(config || {}),
    (socketId) => tttSocketRooms.delete(socketId),
    (roomId, game) => {
      game.startGame();
      tttNamespace.to(roomId).emit("gameState", game.getPublicState());
      scheduleTTTTurnTimeout(roomId);
    },
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

  socket.on("makeMove", (rawData: unknown) => {
    if (!checkSocketRateLimit(socket, "makeMove", 8, 2)) return;

    const valid = validateSocketPayload(
      socket,
      makeMoveTTTSchema,
      rawData,
      "makeMove",
    );
    if (!valid) return;

    const { roomId, index } = valid;
    const game = tttGames.get(roomId);
    if (!game) return;

    if (roomActionLock.isRoomLocked(roomId)) {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "ROOM_LOCKED",
        message: "Aguarde a resolução da jogada anterior!",
      });
      return;
    }

    const effectivePlayerId =
      roomManager.getPlayerIdBySocketId(socket.id) ||
      socket.data?.sessionId ||
      socket.id;
    const cd = roomActionLock.checkCooldown(roomId, effectivePlayerId, 250);
    if (!cd.allowed) {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "ACTION_COOLDOWN",
        message: "Aguarde antes da próxima jogada.",
      });
      return;
    }

    const playerMark =
      game.players.get(socket.id) || game.players.get(effectivePlayerId);
    if (!playerMark) {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "NOT_YOUR_TURN",
        message: "Você não está participando desta partida!",
      });
      return;
    }

    if (game.state !== "playing") {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "GAME_NOT_IN_PROGRESS",
        message: "A partida não está em andamento.",
      });
      return;
    }

    if (playerMark !== game.currentPlayer) {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "NOT_YOUR_TURN",
        message: "Não é a sua vez de jogar!",
      });
      return;
    }

    if (game.board[index] !== null) {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "INVALID_POSITION",
        message: "Esta posição já foi preenchida!",
      });
      return;
    }

    if (!roomActionLock.acquireLock(roomId)) {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "ROOM_LOCKED",
        message: "Ação concorrente detectada.",
      });
      return;
    }

    try {
      const playerKey = game.players.has(socket.id)
        ? socket.id
        : effectivePlayerId;
      if (game.makeMove(playerKey, index)) {
        tttNamespace.to(roomId).emit("gameState", game.getPublicState());

        const tttState = game.state as string;
        if (tttState === "round_result") {
          roomTimerManager.clearTurnTimeout(roomId);
          roomActionLock.lockForTransition(roomId, 3000);
          scheduleNextRound(tttGames, roomId, tttNamespace, 3000, () => {
            roomActionLock.releaseLock(roomId);
            scheduleTTTTurnTimeout(roomId);
          });
        } else if (tttState === "game_over") {
          roomTimerManager.clearAllTimers(roomId);
          handleAutoReturnToLobby(tttNamespace, roomId, tttGames);
          let winnerId: string | null = null;
          if (game.winner && game.winner !== "Draw") {
            for (const [pId, mark] of game.players.entries()) {
              if (mark === game.winner) {
                winnerId = pId;
                break;
              }
            }
          }
          const scores: Record<string, number> = {};
          for (const [pId, mark] of game.players.entries()) {
            if (mark === "X" || mark === "O") {
              scores[pId] = game.scores[mark];
            }
          }
          MatchService.recordMatchFinish(roomId, { winnerId, scores });
        } else {
          scheduleTTTTurnTimeout(roomId);
        }
      }
    } finally {
      if ((game.state as string) === "playing") {
        roomActionLock.releaseLock(roomId);
      }
    }
  });

  socket.on("requestRematch", (roomId: string) => {
    if (!checkSocketRateLimit(socket, "requestRematch", 5, 5)) return;

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
        scheduleTTTTurnTimeout(roomId);
      }
    } else {
      // Just one so far
      tttNamespace.to(roomId).emit("gameState", game.getPublicState());
    }
  });

  // Rematch and Move events stay the same.
});

// --- Connect 4 Namespace ---
const c4Namespace = io.of("/c4");
c4Namespace.use(socketAuthMiddleware);
const c4Games = new Map<string, ConnectFourLogic>();
const c4SocketRooms = new Map<string, string>();

function scheduleC4TurnTimeout(roomId: string) {
  const game = c4Games.get(roomId);
  if (!game || !game.turnEndTime || game.winner || game.state !== "playing") {
    roomTimerManager.clearTurnTimeout(roomId);
    return;
  }

  const targetTime = game.turnEndTime + LAG_COMPENSATION_BUFFER_MS;
  roomTimerManager.scheduleTurnTimeout(roomId, targetTime, async () => {
    if (!roomActionLock.acquireLock(roomId)) return;
    try {
      const g = c4Games.get(roomId);
      if (!g || !g.turnEndTime || g.winner || g.state !== "playing") return;
      if (Date.now() < g.turnEndTime + LAG_COMPENSATION_BUFFER_MS) return;

      const validCols: number[] = [];
      for (let c = 0; c < 7; c++) {
        if (g.board[5]?.[c] === null) {
          validCols.push(c);
        }
      }
      if (validCols.length > 0) {
        const randomCol = validCols[
          Math.floor(Math.random() * validCols.length)
        ] as number;
        let currentPlayerId: string | undefined;
        for (const [id, color] of g.players.entries()) {
          if (color === g.currentPlayer) {
            currentPlayerId = id;
            break;
          }
        }
        if (currentPlayerId) {
          g.makeMove(currentPlayerId, randomCol);
          c4Namespace.to(roomId).emit("gameState", g.getPublicState());
          const c4State = g.state as string;
          if (c4State === "round_result") {
            scheduleNextRound(c4Games, roomId, c4Namespace, 3000, () => {
              scheduleC4TurnTimeout(roomId);
            });
          } else if (c4State === "game_over") {
            handleAutoReturnToLobby(c4Namespace, roomId, c4Games);
          } else {
            scheduleC4TurnTimeout(roomId);
          }
        }
      }
    } finally {
      roomActionLock.releaseLock(roomId);
    }
  });
}

c4Namespace.on("connection", (socket: Socket) => {
  logConnection(socket, "Connect 4");

  registerGenericLobbyEvents(
    socket,
    c4Namespace,
    "c4",
    c4Games,
    (config) => new ConnectFourLogic(config || {}),
    (socketId) => c4SocketRooms.delete(socketId),
    (roomId, game) => {
      game.startGame();
      c4Namespace.to(roomId).emit("gameState", game.getPublicState());
      scheduleC4TurnTimeout(roomId);
    },
  );

  socket.on("joinRoom", (roomId: string) => {
    socket.join(roomId);
    const game = c4Games.get(roomId);
    if (!game) return;

    c4SocketRooms.set(socket.id, roomId);
    game.addPlayer(socket.id);

    const roomClients = c4Namespace.adapter.rooms.get(roomId);
    if (roomClients?.size === 1) {
      socket.emit("waitingForOpponent");
    } else if (roomClients?.size === 2) {
      // Both players are connected, send state with individual assigned color
      for (const clientId of roomClients) {
        const clientSocket = c4Namespace.sockets.get(clientId);
        if (clientSocket) {
          clientSocket.emit("gameState", {
            ...game.getPublicState(),
            yourColor: game.players.get(clientId),
          });
        }
      }
    }
  });

  socket.on("makeMove", (rawData: unknown) => {
    if (!checkSocketRateLimit(socket, "makeMove", 8, 2)) return;

    const valid = validateSocketPayload(
      socket,
      makeMoveC4Schema,
      rawData,
      "makeMove",
    );
    if (!valid) return;

    const { roomId, col } = valid;
    const game = c4Games.get(roomId);
    if (!game) return;

    if (roomActionLock.isRoomLocked(roomId)) {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "ROOM_LOCKED",
        message: "Aguarde a resolução da jogada anterior!",
      });
      return;
    }

    const effectivePlayerId =
      roomManager.getPlayerIdBySocketId(socket.id) ||
      socket.data?.sessionId ||
      socket.id;
    const cd = roomActionLock.checkCooldown(roomId, effectivePlayerId, 250);
    if (!cd.allowed) {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "ACTION_COOLDOWN",
        message: "Aguarde antes da próxima jogada.",
      });
      return;
    }

    const playerColor =
      game.players.get(socket.id) || game.players.get(effectivePlayerId);
    if (!playerColor) {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "NOT_YOUR_TURN",
        message: "Você não está participando desta partida!",
      });
      return;
    }

    if (game.state !== "playing") {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "GAME_NOT_IN_PROGRESS",
        message: "A partida não está em andamento.",
      });
      return;
    }

    if (playerColor !== game.currentPlayer) {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "NOT_YOUR_TURN",
        message: "Não é a sua vez de jogar!",
      });
      return;
    }

    if (game.board[5]?.[col] !== null) {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "INVALID_POSITION",
        message: "Esta coluna já está cheia!",
      });
      return;
    }

    if (!roomActionLock.acquireLock(roomId)) {
      socket.emit("invalidMove", {
        event: "makeMove",
        reason: "ROOM_LOCKED",
        message: "Ação concorrente detectada.",
      });
      return;
    }

    try {
      const playerKey = game.players.has(socket.id)
        ? socket.id
        : effectivePlayerId;
      if (game.makeMove(playerKey, col)) {
        c4Namespace.to(roomId).emit("gameState", game.getPublicState());

        const c4State = game.state as string;
        if (c4State === "round_result") {
          roomTimerManager.clearTurnTimeout(roomId);
          roomActionLock.lockForTransition(roomId, 3000);
          scheduleNextRound(c4Games, roomId, c4Namespace, 3000, () => {
            roomActionLock.releaseLock(roomId);
            scheduleC4TurnTimeout(roomId);
          });
        } else if (c4State === "game_over") {
          roomTimerManager.clearAllTimers(roomId);
          handleAutoReturnToLobby(c4Namespace, roomId, c4Games);
          let winnerId: string | null = null;
          if (game.winner && game.winner !== "Draw") {
            for (const [pId, color] of game.players.entries()) {
              if (color === game.winner) {
                winnerId = pId;
                break;
              }
            }
          }
          const scores: Record<string, number> = {};
          for (const [pId, color] of game.players.entries()) {
            if (color === "RED" || color === "YELLOW") {
              scores[pId] = game.scores[color];
            }
          }
          MatchService.recordMatchFinish(roomId, { winnerId, scores });
        } else {
          scheduleC4TurnTimeout(roomId);
        }
      }
    } finally {
      if ((game.state as string) === "playing") {
        roomActionLock.releaseLock(roomId);
      }
    }
  });

  socket.on("requestRematch", (roomId: string) => {
    if (!checkSocketRateLimit(socket, "requestRematch", 5, 5)) return;

    const game = c4Games.get(roomId);
    if (!game) return;

    if (game.requestRematch(socket.id)) {
      cancelAutoReturnToLobby(roomId);
      game.reset();
      c4Namespace.to(roomId).emit("rematchStarted");
      const roomClients = c4Namespace.adapter.rooms.get(roomId);
      if (roomClients) {
        for (const clientId of roomClients) {
          const clientSocket = c4Namespace.sockets.get(clientId);
          if (clientSocket) {
            clientSocket.emit("gameState", {
              ...game.getPublicState(),
              yourColor: game.players.get(clientId),
            });
          }
        }
        scheduleC4TurnTimeout(roomId);
      }
    } else {
      c4Namespace.to(roomId).emit("gameState", game.getPublicState());
    }
  });
});

// --- Rock-Paper-Scissors Namespace ---
const rpsNamespace = io.of("/rps");
rpsNamespace.use(socketAuthMiddleware);
const rpsGames = new Map<string, RPSLogic>();

function scheduleRPSTurnTimeout(roomId: string) {
  const game = rpsGames.get(roomId);
  if (!game || !game.turnEndTime || game.state !== "commit_phase") {
    roomTimerManager.clearTurnTimeout(roomId);
    return;
  }

  const targetTime = game.turnEndTime + LAG_COMPENSATION_BUFFER_MS;
  roomTimerManager.scheduleTurnTimeout(roomId, targetTime, async () => {
    if (!roomActionLock.acquireLock(roomId)) return;
    try {
      const g = rpsGames.get(roomId);
      if (!g || g.state !== "commit_phase") return;

      let changed = false;
      for (const [playerId, player] of g.players.entries()) {
        if (!player.hasCommitted) {
          g.commitChoice(
            playerId,
            ["rock", "paper", "scissors"][
              Math.floor(Math.random() * 3)
            ] as RPSChoice,
          );
          changed = true;
        }
      }
      if (changed) {
        rpsNamespace.to(roomId).emit("gameState", g.getPublicState());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((g as any).state === "reveal_phase") {
          roomTimerManager.clearTurnTimeout(roomId);
          roomActionLock.lockForTransition(roomId, 3000);
          scheduleNextRound(rpsGames, roomId, rpsNamespace, 3000, (nextG) => {
            roomActionLock.releaseLock(roomId);
            if (nextG.state === "commit_phase") {
              nextG.beginCommitPhase();
              scheduleRPSTurnTimeout(roomId);
            }
            rpsNamespace.to(roomId).emit("gameState", nextG.getPublicState());
          });
        }
      }
    } finally {
      roomActionLock.releaseLock(roomId);
    }
  });
}

rpsNamespace.on("connection", (socket: Socket) => {
  logConnection(socket, "Rock-Paper-Scissors");

  registerGenericLobbyEvents(
    socket,
    rpsNamespace,
    "rps",
    rpsGames,
    (config) => new RPSLogic(config?.maxRounds || 3, config),
    undefined,
    (roomId, game) => {
      game.startGame();
      rpsNamespace.to(roomId).emit("gameState", game.getPublicState());
      scheduleRPSTurnTimeout(roomId);
    },
  );

  socket.on("joinRoom", (roomId: string) => {
    socket.join(roomId);
    const game = rpsGames.get(roomId);
    if (!game) return;

    game.addPlayer(socket.id);
    rpsNamespace.to(roomId).emit("gameState", game.getPublicState());
  });

  socket.on("commitChoice", (rawData: unknown) => {
    if (!checkSocketRateLimit(socket, "commitChoice", 8, 2)) return;

    const valid = validateSocketPayload(
      socket,
      commitChoiceRPSSchema,
      rawData,
      "commitChoice",
    );
    if (!valid) return;

    const { roomId, choice } = valid;
    const game = rpsGames.get(roomId);
    if (!game) return;

    if (roomActionLock.isRoomLocked(roomId)) {
      socket.emit("invalidMove", {
        event: "commitChoice",
        reason: "ROOM_LOCKED",
        message: "Aguarde a revelação da rodada anterior!",
      });
      return;
    }

    const effectivePlayerId =
      roomManager.getPlayerIdBySocketId(socket.id) ||
      socket.data?.sessionId ||
      socket.id;
    const cd = roomActionLock.checkCooldown(roomId, effectivePlayerId, 250);
    if (!cd.allowed) {
      socket.emit("invalidMove", {
        event: "commitChoice",
        reason: "ACTION_COOLDOWN",
        message: "Aguarde antes da próxima jogada.",
      });
      return;
    }

    const playerKey = game.players.has(socket.id)
      ? socket.id
      : (game.players.has(effectivePlayerId) ? effectivePlayerId : null);

    if (!playerKey) {
      socket.emit("invalidMove", {
        event: "commitChoice",
        reason: "NOT_YOUR_TURN",
        message: "Você não está participando desta partida!",
      });
      return;
    }

    if (game.state !== "commit_phase") {
      socket.emit("invalidMove", {
        event: "commitChoice",
        reason: "GAME_NOT_IN_PROGRESS",
        message: "A rodada não está na fase de escolhas.",
      });
      return;
    }

    if (game.players.get(playerKey)?.hasCommitted) {
      socket.emit("invalidMove", {
        event: "commitChoice",
        reason: "ALREADY_COMMITTED",
        message: "Você já realizou sua escolha nesta rodada!",
      });
      return;
    }

    if (game.commitChoice(playerKey, choice)) {
      rpsNamespace.to(roomId).emit("gameState", game.getPublicState());

      const rpsState = game.state as string;
      if (rpsState === "reveal_phase") {
        roomTimerManager.clearTurnTimeout(roomId);
        roomActionLock.lockForTransition(roomId, 3000);
        scheduleNextRound(rpsGames, roomId, rpsNamespace, 3000, (nextG) => {
          roomActionLock.releaseLock(roomId);
          if (nextG.state === "commit_phase") {
            nextG.beginCommitPhase();
            scheduleRPSTurnTimeout(roomId);
          }
          rpsNamespace.to(roomId).emit("gameState", nextG.getPublicState());
        });
      } else if (rpsState === "game_over") {
        roomTimerManager.clearAllTimers(roomId);
        handleAutoReturnToLobby(rpsNamespace, roomId, rpsGames);
        const scores: Record<string, number> = {};
        let highestScore = -1;
        let winnerId: string | null = null;
        for (const [pId, p] of game.players.entries()) {
          scores[pId] = p.score;
          if (p.score > highestScore) {
            highestScore = p.score;
            winnerId = pId;
          } else if (p.score === highestScore) {
            winnerId = null;
          }
        }
        MatchService.recordMatchFinish(roomId, {
          winnerId,
          scores,
        });
      }
    }
  });

  socket.on("requestRematch", (roomId: string) => {
    if (!checkSocketRateLimit(socket, "requestRematch", 5, 5)) return;

    const game = rpsGames.get(roomId);
    if (!game) return;

    if (game.requestRematch(socket.id)) {
      cancelAutoReturnToLobby(roomId);
      game.reset();
      rpsNamespace.to(roomId).emit("rematchStarted");
      rpsNamespace.to(roomId).emit("gameState", game.getPublicState());
      scheduleRPSTurnTimeout(roomId);
    } else {
      rpsNamespace.to(roomId).emit("gameState", game.getPublicState());
    }
  });

  // Rematch and Move events stay the same
});

// --- Guess the Flag Namespace ---
const gtfNamespace = io.of("/gtf");
gtfNamespace.use(socketAuthMiddleware);
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

  socket.on("submitGuess", (rawData: unknown) => {
    if (!checkSocketRateLimit(socket, "submitGuess", 8, 2)) return;

    const valid = validateSocketPayload(
      socket,
      submitGuessGTFSchema,
      rawData,
      "submitGuess",
    );
    if (!valid) return;

    const { roomId, guess } = valid;
    const game = gtfGames.get(roomId);
    if (!game) return;

    if (roomActionLock.isRoomLocked(roomId)) {
      socket.emit("invalidMove", {
        event: "submitGuess",
        reason: "ROOM_LOCKED",
        message: "Aguarde o início da próxima rodada!",
      });
      return;
    }

    const effectivePlayerId =
      roomManager.getPlayerIdBySocketId(socket.id) ||
      socket.data?.sessionId ||
      socket.id;
    const cd = roomActionLock.checkCooldown(roomId, effectivePlayerId, 250);
    if (!cd.allowed) {
      socket.emit("invalidMove", {
        event: "submitGuess",
        reason: "ACTION_COOLDOWN",
        message: "Aguarde antes da próxima jogada.",
      });
      return;
    }

    const playerKey = game.players.has(socket.id)
      ? socket.id
      : (game.players.has(effectivePlayerId) ? effectivePlayerId : null);

    if (!playerKey) {
      socket.emit("invalidMove", {
        event: "submitGuess",
        reason: "NOT_YOUR_TURN",
        message: "Você não está participando desta partida!",
      });
      return;
    }

    if (game.state !== "guessing_phase") {
      socket.emit("invalidMove", {
        event: "submitGuess",
        reason: "GAME_NOT_IN_PROGRESS",
        message: "Aguarde a rodada estar ativa para enviar palpites.",
      });
      return;
    }

    const player = game.players.get(playerKey);
    if (player?.hasGuessed) {
      socket.emit("invalidMove", {
        event: "submitGuess",
        reason: "ALREADY_COMMITTED",
        message: "Você já enviou seu palpite nesta rodada!",
      });
      return;
    }

    if (game.submitGuess(playerKey, guess)) {
      gtfNamespace.to(roomId).emit("gameState", game.getPublicState());

      const gtfState = game.state as string;
      if (gtfState === "round_result") {
        roomTimerManager.clearTurnTimeout(roomId);
        roomActionLock.lockForTransition(roomId, 5000);
        scheduleNextRound(gtfGames, roomId, gtfNamespace, 5000, (g) => {
          roomActionLock.releaseLock(roomId);
          if (g.state === "guessing_phase") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            startGTFRound(roomId, g as any);
          } else if (g.state === "game_over") {
            roomTimerManager.clearAllTimers(roomId);
            gtfNamespace.to(roomId).emit("gameState", g.getPublicState());
            handleAutoReturnToLobby(gtfNamespace, roomId, gtfGames);
            let highestScore = -1;
            let winnerId: string | null = null;
            const scores: Record<string, number> = {};
            for (const [pId, p] of g.players.entries()) {
              scores[pId] = p.score;
              if (p.score > highestScore) {
                highestScore = p.score;
                winnerId = pId;
              } else if (p.score === highestScore) {
                winnerId = null; // tie
              }
            }
            MatchService.recordMatchFinish(roomId, { winnerId, scores });
          }
        });
      }
    }
  });

  socket.on("requestRematch", (roomId: string) => {
    if (!checkSocketRateLimit(socket, "requestRematch", 5, 5)) return;

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
hangmanNamespace.use(socketAuthMiddleware);
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

  socket.on(GameEvent.GAME_MOVE, (rawData: unknown) => {
    if (!checkSocketRateLimit(socket, "gameMove", 10, 2)) return;

    const valid = validateSocketPayload(
      socket,
      gameMoveHangmanSchema,
      rawData,
      "gameMove",
    );
    if (!valid) return;
    const { roomId, action } = valid;
    hangmanController.handleMove(socket, roomId, action);
  });

  socket.on("requestRematch", (roomId: string) => {
    if (!checkSocketRateLimit(socket, "requestRematch", 5, 5)) return;

    hangmanController.handleRematch(socket.id, roomId);
  });
});

// --- Memory Card Namespace ---
const mcNamespace = io.of("/mc");
mcNamespace.use(socketAuthMiddleware);
const memoryCardController = new MemoryCardController(mcNamespace);

mcNamespace.on("connection", (socket: Socket) => {
  logConnection(socket, "Memory Card");

  registerGenericLobbyEvents(
    socket,
    mcNamespace,
    "mc",
    memoryCardController.getGamesMap(),
    () => ({}), // Truthy placeholder for MemoryCardController
    undefined,
    (roomId: string) => {
      const room = roomManager.getRoom(roomId);
      if (room) {
        memoryCardController.initGame(
          roomId,
          room.players.map((p) => p.id),
          room.config,
        );
      }
    },
    (roomId: string) => {
      memoryCardController.removeGame(roomId);
    },
  );

  socket.on("joinRoom", (roomId: string) => {
    socket.join(roomId);
    memoryCardController.broadcastState(roomId);
  });

  socket.on("flipCard", (rawData: unknown) => {
    if (!checkSocketRateLimit(socket, "flipCard", 8, 2)) return;

    const valid = validateSocketPayload(
      socket,
      flipCardMCSchema,
      rawData,
      "flipCard",
    );
    if (!valid) return;
    const { roomId, cardId } = valid;
    memoryCardController.handleFlipCard(socket, roomId, { cardId });
  });

  socket.on("requestRematch", (roomId: string) => {
    if (!checkSocketRateLimit(socket, "requestRematch", 5, 5)) return;

    memoryCardController.handleRematch(socket, roomId);
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
  scheduleGTFTurnTimeout(roomId);
}

function scheduleGTFTurnTimeout(roomId: string) {
  const game = gtfGames.get(roomId);
  if (!game || !game.turnEndTime || game.state !== "guessing_phase") {
    roomTimerManager.clearTurnTimeout(roomId);
    return;
  }

  const targetTime = game.turnEndTime + LAG_COMPENSATION_BUFFER_MS;
  roomTimerManager.scheduleTurnTimeout(roomId, targetTime, async () => {
    if (!roomActionLock.acquireLock(roomId)) return;
    try {
      const g = gtfGames.get(roomId);
      if (!g || g.state !== "guessing_phase") return;

      g.timeoutRound();
      gtfNamespace.to(roomId).emit("gameState", g.getPublicState());

      scheduleNextRound(gtfGames, roomId, gtfNamespace, 5000, (nextG) => {
        if (nextG.state === "guessing_phase") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          startGTFRound(roomId, nextG as any);
        } else if (nextG.state === "game_over") {
          gtfNamespace.to(roomId).emit("gameState", nextG.getPublicState());
        }
      });
    } finally {
      roomActionLock.releaseLock(roomId);
    }
  });
}

// Observabilidade dos Timers Orientados a Eventos
console.log("[GameHub-API] Event-Driven RoomTimerManager active (O(1) timers per match, zero polling).");
app.get("/", (req, res) => {
  res.send(renderDashboard(roomManager.getStats()));
});

app.get("/api/stats", (req, res) => {
  res.json({
    ...roomManager.getStats(),
    timers: roomTimerManager.getStats(),
  });
});

// Authentication & Session Routes
app.post("/api/auth/register", (req, res) => {
  AuthController.register(req, res);
});

app.post("/api/auth/login", (req, res) => {
  AuthController.login(req, res);
});

app.post("/api/auth/guest", (req, res) => {
  AuthController.guest(req, res);
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  AuthController.me(req as AuthenticatedRequest, res);
});

// Global Error Handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[Express Error Handler]:", err);
    const status = err.status || 500;
    res.status(status).json({
      error: status === 500 ? "Internal server error" : err.message,
    });
  },
);

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  await setupRedisAdapter(io);

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("[Bootstrap Error]:", err);
});
