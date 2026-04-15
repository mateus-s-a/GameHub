export const ROUND_OPTIONS = [1, 3, 5, 7] as const;
export type RoundOption = typeof ROUND_OPTIONS[number];

export const TIME_OPTIONS = [5, 15, 30, 0] as const;
export type TimeOption = typeof TIME_OPTIONS[number];

export const PLAYER_OPTIONS = [2, 3, 4] as const;
export type PlayerOption = typeof PLAYER_OPTIONS[number];

export const GAME_CONSTANTS = {
  TIC_TAC_TOE_GRID_SIZE: 3,
} as const;
