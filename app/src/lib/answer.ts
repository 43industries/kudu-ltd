/**
 * Normalizes a puzzle answer before hashing or comparing.
 * Strips leading/trailing whitespace, lowercases if not case-sensitive,
 * and removes punctuation for riddle-type puzzles.
 */
export function normalizeAnswer(raw: string, caseSensitive: boolean): string {
  let answer = raw.trim();
  if (!caseSensitive) {
    answer = answer.toLowerCase();
  }
  // Strip punctuation for a forgiving match
  answer = answer.replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
  return answer;
}

/**
 * XP thresholds for each rank.
 */
export const RANK_THRESHOLDS = {
  LURKER: 0,
  CURIOUS: 100,
  DIGGER: 500,
  TRUTH_SEEKER: 1500,
  DEEP_DIVER: 4000,
  RABBIT_MASTER: 10000,
} as const;

type Rank = keyof typeof RANK_THRESHOLDS;

export function computeRank(xp: number): Rank {
  const ranks = Object.entries(RANK_THRESHOLDS).sort(([, a], [, b]) => b - a) as [Rank, number][];
  for (const [rank, threshold] of ranks) {
    if (xp >= threshold) return rank;
  }
  return "LURKER";
}
