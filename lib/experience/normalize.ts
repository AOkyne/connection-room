// Question identity helpers. Exact duplicates (after normalizing case,
// punctuation and spacing) are refused -- they'd be the same canonical
// question under a new identity. Likely paraphrases are only FLAGGED for
// review, never silently merged or treated as fresh.

export function normalizeQuestionText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(
  "a an and are as at be but by can do does did for from has have how i if in into is it its me my of on or our so than that the their them then there these they this to too us was we were what when where which who why will with you your yours yourself".split(
    " "
  )
);

function contentWords(text: string): Set<string> {
  return new Set(
    normalizeQuestionText(text)
      .split(" ")
      .map((w) => w.replace(/'s$/, ""))
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

/** Jaccard overlap of content words, 0..1. */
export function questionSimilarity(a: string, b: string): number {
  const wa = contentWords(a);
  const wb = contentWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / (wa.size + wb.size - shared);
}

export const SIMILARITY_FLAG_THRESHOLD = 0.6;

/** The most similar existing question at or above the threshold, if any. */
export function findSimilarQuestion<T extends { id: string; text: string }>(text: string, existing: T[]): T | null {
  let best: T | null = null;
  let bestScore = SIMILARITY_FLAG_THRESHOLD;
  for (const q of existing) {
    const score = questionSimilarity(text, q.text);
    if (score >= bestScore) {
      best = q;
      bestScore = score;
    }
  }
  return best;
}
