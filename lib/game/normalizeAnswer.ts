const SIMPLE_PUNCTUATION = /[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]/g;
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;

export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(CONTROL_CHARS, "")
    .replace(SIMPLE_PUNCTUATION, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCorrectGuess(guess: string, answer: string): boolean {
  const normalizedGuess = normalizeAnswer(guess);
  const normalizedAnswer = normalizeAnswer(answer);

  return normalizedGuess.length > 0 && normalizedGuess === normalizedAnswer;
}

export function similarityRatio(a: string, b: string): number {
  const left = normalizeAnswer(a);
  const right = normalizeAnswer(b);

  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const distance = levenshtein(left, right);
  const maxLength = Math.max(left.length, right.length);

  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

export function isNearGuess(guess: string, answer: string): boolean {
  const normalizedGuess = normalizeAnswer(guess);
  const normalizedAnswer = normalizeAnswer(answer);

  if (
    normalizedGuess.length < 4 ||
    normalizedAnswer.length < 4 ||
    normalizedGuess === normalizedAnswer
  ) {
    return false;
  }

  if (
    normalizedAnswer.includes(normalizedGuess) ||
    normalizedGuess.includes(normalizedAnswer)
  ) {
    return false;
  }

  const distance = levenshtein(normalizedGuess, normalizedAnswer);
  const ratio = similarityRatio(normalizedGuess, normalizedAnswer);

  return ratio >= 0.82 || (normalizedAnswer.length >= 7 && distance <= 2);
}

function levenshtein(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}
