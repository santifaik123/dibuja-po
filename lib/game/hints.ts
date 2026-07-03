const LETTER_REGEX = /\p{L}|\p{N}/u;

export function createHint(word: string, elapsedSeconds: number): string {
  const revealRatio = elapsedSeconds >= 55 ? 0.34 : elapsedSeconds >= 30 ? 0.18 : 0;
  const letterPositions = Array.from(word)
    .map((character, index) => ({ character, index }))
    .filter(({ character }) => LETTER_REGEX.test(character));
  const revealCount = Math.floor(letterPositions.length * revealRatio);
  const revealed = new Set<number>();

  for (let i = 0; i < letterPositions.length && revealed.size < revealCount; i += 1) {
    const candidate = letterPositions[(i * 3 + word.length) % letterPositions.length];
    revealed.add(candidate.index);
  }

  return Array.from(word)
    .map((character, index) => {
      if (!LETTER_REGEX.test(character)) {
        return character === " " ? " " : character;
      }

      return revealed.has(index) ? character : "_";
    })
    .join("");
}
