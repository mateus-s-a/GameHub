export const ROUND_OPTIONS = [1, 3, 5, 7] as const;
export type RoundOption = (typeof ROUND_OPTIONS)[number];

export const TIME_OPTIONS = [5, 15, 30, 0] as const;
export type TimeOption = (typeof TIME_OPTIONS)[number];

export const PLAYER_OPTIONS = [2, 3, 4] as const;
export type PlayerOption = (typeof PLAYER_OPTIONS)[number];

export const GAME_CONSTANTS = {
  TIC_TAC_TOE_GRID_SIZE: 3,
} as const;

export const ANIMATION_TOKENS = {
  CAROUSEL_SPRING: {
    type: "spring",
    stiffness: 260,
    damping: 32,
    mass: 1,
  },
  BLUR_FIXED_AMOUNT: "blur(12px)",
} as const;

export const CAROUSEL_GESTURE_CONFIG = {
  SWIPE_THRESHOLD: 50,
  VELOCITY_THRESHOLD: 500,
  DRAG_ELASTIC: 0.2,
} as const;

export enum GameEvent {
  JOIN_ROOM = "joinRoom",
  LEAVE_ROOM = "leaveRoom",
  GAME_MOVE = "gameMove",
  STATE_UPDATE = "gameState",
  REMATCH_REQUEST = "requestRematch",
  REMATCH_STARTED = "rematchStarted",
}
