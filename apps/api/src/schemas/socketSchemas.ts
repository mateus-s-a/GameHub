import { z } from "zod";
import { Socket } from "socket.io";
import { sanitizeText } from "../lib/sanitize";

export const playerNameSchema = z
  .string()
  .min(1, "Name must have at least 1 character")
  .max(30, "Name must not exceed 30 characters")
  .transform((val) => sanitizeText(val))
  .refine((val) => val.length > 0, "Name cannot be empty or solely HTML tags");

export const createRoomSchema = z
  .object({
    maxPlayers: z.number().int().min(2).max(4).optional(),
    maxRounds: z.number().int().min(1).max(20).optional(),
    timeLimit: z.number().int().min(5).max(120).optional(),
    region: z
      .string()
      .max(50)
      .transform((val) => sanitizeText(val))
      .optional(),
    mode: z.enum(["standard", "custom"]).optional(),
    boardSize: z.string().max(20).optional(),
  })
  .optional();

export const roomIdSchema = z.string().uuid("Invalid room ID");

export const updateRoomConfigSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  config: z.object({
    maxRounds: z.number().int().min(1).max(20).optional(),
    timeLimit: z.number().int().min(5).max(120).optional(),
    region: z
      .string()
      .max(50)
      .transform((val) => sanitizeText(val))
      .optional(),
    maxPlayers: z.number().int().min(2).max(4).optional(),
    mode: z.enum(["standard", "custom"]).optional(),
    boardSize: z.string().max(20).optional(),
  }),
});

// Tic-Tac-Toe
export const makeMoveTTTSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  index: z.number().int().min(0).max(8, "Board index must be between 0 and 8"),
});

// Connect Four
export const makeMoveC4Schema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  col: z.number().int().min(0).max(6, "Column must be between 0 and 6"),
});

// Rock-Paper-Scissors
export const commitChoiceRPSSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  choice: z.enum(["rock", "paper", "scissors"]),
});

// Guess The Flag
export const submitGuessGTFSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  guess: z
    .string()
    .min(1)
    .max(100, "Guess cannot exceed 100 characters")
    .transform((val) => sanitizeText(val)),
});

// Memory Card
export const flipCardMCSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  cardId: z.number().int().min(0).max(100, "Card ID out of range"),
});

// Hangman
export const gameMoveHangmanSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  action: z.any(),
});

/**
 * Validates incoming socket payload against a Zod schema.
 * Emits "payloadError" and returns null if validation fails.
 */
export function validateSocketPayload<T>(
  socket: Socket,
  schema: z.ZodSchema<T>,
  data: unknown,
  eventName: string,
): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    socket.emit("payloadError", {
      event: eventName,
      message: "Invalid payload format",
      issues: result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
    return null;
  }
  return result.data;
}
