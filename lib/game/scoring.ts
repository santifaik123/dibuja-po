import type { ScoreEvent } from "./types";

export function pointsForGuess(guessIndex: number): ScoreEvent["reason"] {
  if (guessIndex === 0) {
    return "first_guess";
  }

  if (guessIndex === 1) {
    return "second_guess";
  }

  return "later_guess";
}

export function scoreForGuess(guessIndex: number): number {
  if (guessIndex === 0) {
    return 100;
  }

  if (guessIndex === 1) {
    return 70;
  }

  return 50;
}

export const DRAWER_BONUS = 50;
