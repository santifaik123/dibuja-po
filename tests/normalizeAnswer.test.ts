import { describe, expect, it } from "vitest";
import { isCorrectGuess, isNearGuess, normalizeAnswer } from "@/lib/game/normalizeAnswer";

describe("normalizeAnswer", () => {
  it("ignores case, accents, punctuation and extra spaces", () => {
    expect(normalizeAnswer("  Sopaipílla!!! ")).toBe("sopaipilla");
    expect(isCorrectGuess(" sopaipílla ", "Sopaipilla")).toBe(true);
  });

  it("requires the complete normalized phrase", () => {
    expect(isCorrectGuess("completo", "completo italiano")).toBe(false);
    expect(isCorrectGuess("completo italiano", "completo italiano")).toBe(true);
  });

  it("detects close guesses without accepting partial answers", () => {
    expect(isNearGuess("sopaipila", "sopaipilla")).toBe(true);
    expect(isNearGuess("sopa", "sopaipilla")).toBe(false);
  });
});
