export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’`]/g, "'")
    .replace(/[^a-zA-Z0-9%.'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeName(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

export function levenshtein(a: string, b: string): number {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

export function similarity(a: string, b: string): number {
  const left = normalizeText(a);
  const right = normalizeText(b);
  const longest = Math.max(left.length, right.length);
  if (!longest) return 1;
  return Math.max(0, 1 - levenshtein(left, right) / longest);
}

export function bestMatchingLine(text: string, expected: string): string | undefined {
  if (!expected.trim()) return undefined;
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return undefined;

  const candidates = lines.flatMap((_, index) =>
    [1, 2, 3]
      .filter((length) => index + length <= lines.length)
      .map((length) => lines.slice(index, index + length).join(" ")),
  );

  return candidates.reduce((best, candidate) =>
    similarity(candidate, expected) > similarity(best, expected) ? candidate : best,
  );
}

export function parseVolume(value: string): number | undefined {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(ml|millilit(?:er|re)s?|l|lit(?:er|re)s?)\b/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  return /^l|^lit/i.test(match[2]) ? amount * 1000 : amount;
}
