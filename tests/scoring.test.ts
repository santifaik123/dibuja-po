import { describe, expect, it } from "vitest";
import { DRAWER_BONUS, pointsForGuess, scoreForGuess } from "@/lib/game/scoring";

describe("scoring", () => {
  it("scores guesses by order and caps drawer bonus constant", () => {
    expect(scoreForGuess(0)).toBe(100);
    expect(scoreForGuess(1)).toBe(70);
    expect(scoreForGuess(2)).toBe(50);
    expect(scoreForGuess(8)).toBe(50);
    expect(DRAWER_BONUS).toBe(50);
  });

  it("names score event reasons", () => {
    expect(pointsForGuess(0)).toBe("first_guess");
    expect(pointsForGuess(1)).toBe("second_guess");
    expect(pointsForGuess(2)).toBe("later_guess");
  });
});
