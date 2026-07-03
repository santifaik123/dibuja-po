import { describe, expect, it } from "vitest";
import { createCensoredHint, createHint } from "@/lib/game/hints";

describe("hints", () => {
  it("starts with a fully censored one-word hint", () => {
    expect(createCensoredHint("piscola")).toBe("•••••••");
  });

  it("reveals more letters as the round timer advances", () => {
    const early = createHint("sopaipilla", 0);
    const middle = createHint("sopaipilla", 50);
    const late = createHint("sopaipilla", 65);

    expect(early).toBe("••••••••••");
    expect(countVisibleLetters(middle)).toBeGreaterThan(countVisibleLetters(early));
    expect(countVisibleLetters(late)).toBeGreaterThan(countVisibleLetters(middle));
  });
});

function countVisibleLetters(hint: string): number {
  return Array.from(hint).filter((character) => character !== "•").length;
}
