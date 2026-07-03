import type { ScoreEvent } from "./types";

const MIN_TIME_MULTIPLIER = 0.5;
const DRAWER_BONUS_RATIO = 0.4;
const MIN_DRAWER_BONUS = 15;

export function pointsForGuess(guessIndex: number): ScoreEvent["reason"] {
  if (guessIndex === 0) {
    return "first_guess";
  }

  if (guessIndex === 1) {
    return "second_guess";
  }

  return "later_guess";
}

export function scoreForGuess(
  guessIndex: number,
  remainingSeconds = 80,
  roundSeconds = 80,
): number {
  const baseScore = baseScoreForGuess(guessIndex);
  const safeRoundSeconds = Math.max(1, roundSeconds);
  const timeRatio = Math.min(1, Math.max(0, remainingSeconds / safeRoundSeconds));
  const timeMultiplier = MIN_TIME_MULTIPLIER + timeRatio * (1 - MIN_TIME_MULTIPLIER);

  return roundToNearestFive(baseScore * timeMultiplier);
}

export function drawerBonusForGuess(guessPoints: number): number {
  return Math.max(MIN_DRAWER_BONUS, roundToNearestFive(guessPoints * DRAWER_BONUS_RATIO));
}

function baseScoreForGuess(guessIndex: number): number {
  if (guessIndex === 0) {
    return 100;
  }

  if (guessIndex === 1) {
    return 70;
  }

  return 50;
}

function roundToNearestFive(value: number): number {
  return Math.max(0, Math.round(value / 5) * 5);
}
