import { GameSetupConfig } from "@gamehub/types";

/**
 * Performs a shallow value comparison of two GameSetupConfig objects.
 * Efficiently determines if any match settings have changed.
 */
export function compareConfigs(
  a: GameSetupConfig,
  b: GameSetupConfig,
): boolean {
  if (!a || !b) return a === b;

  // Check shared numeric properties
  if (a.maxRounds !== b.maxRounds) return false;
  if (a.timeLimit !== b.timeLimit) return false;

  // Check game-specific optional properties
  if (a.region !== b.region) return false;
  if (a.maxPlayers !== b.maxPlayers) return false;

  return true;
}
