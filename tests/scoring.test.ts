import { describe, expect, it } from "vitest";
import { drawerBonusForGuess, pointsForGuess, scoreForGuess } from "@/lib/game/scoring";

describe("scoring", () => {
  it("scores guesses by order and remaining time", () => {
    expect(scoreForGuess(0, 80, 80)).toBe(100);
    expect(scoreForGuess(1, 80, 80)).toBe(70);
    expect(scoreForGuess(2, 80, 80)).toBe(50);
    expect(scoreForGuess(8, 80, 80)).toBe(50);
    expect(scoreForGuess(0, 40, 80)).toBe(75);
    expect(scoreForGuess(0, 0, 80)).toBe(50);
  });

  it("gives the drawer a bonus based on the guess score", () => {
    expect(drawerBonusForGuess(100)).toBe(40);
    expect(drawerBonusForGuess(70)).toBe(30);
    expect(drawerBonusForGuess(25)).toBe(15);
  });

  it("names score event reasons", () => {
    expect(pointsForGuess(0)).toBe("first_guess");
    expect(pointsForGuess(1)).toBe("second_guess");
    expect(pointsForGuess(2)).toBe("later_guess");
  });
});
