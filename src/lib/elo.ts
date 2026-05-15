/**
 * ELO rating system for the challenge (تحدي) feature.
 * Based on standard chess ELO with variable K-factor:
 *   K=40 for < 10 matches (new), K=32 for < 20, K=24 for < 40, K=16 for veteran.
 */

export function getKFactor(totalMatches: number): number {
  if (totalMatches < 10) return 40;
  if (totalMatches < 20) return 32;
  if (totalMatches < 40) return 24;
  return 16;
}

export type EloResult = {
  newA: number;
  newB: number;
  deltaA: number;
  deltaB: number;
};

/**
 * Calculate new ELO ratings after a match.
 * resultA: 1 = A wins, 0.5 = draw, 0 = A loses
 */
export function calcElo(
  ratingA: number,
  ratingB: number,
  resultA: 1 | 0.5 | 0,
  matchesA: number,
  matchesB: number
): EloResult {
  const kA = getKFactor(matchesA);
  const kB = getKFactor(matchesB);
  const resultB = (1 - resultA) as 1 | 0.5 | 0;

  // Expected scores using ELO formula
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;

  const deltaA = Math.round(kA * (resultA - expectedA));
  const deltaB = Math.round(kB * (resultB - expectedB));

  return {
    newA: Math.max(100, ratingA + deltaA),
    newB: Math.max(100, ratingB + deltaB),
    deltaA,
    deltaB,
  };
}

/** Arabic ELO tier label */
export function eloTier(elo: number): { label: string; color: string } {
  if (elo >= 1600) return { label: 'محترف',  color: 'text-yellow-600' };
  if (elo >= 1400) return { label: 'متقدم',  color: 'text-purple-600' };
  if (elo >= 1200) return { label: 'جيد',    color: 'text-blue-600'   };
  if (elo >= 1000) return { label: 'متوسط',  color: 'text-green-600'  };
  return               { label: 'مبتدئ',    color: 'text-gray-500'   };
}
