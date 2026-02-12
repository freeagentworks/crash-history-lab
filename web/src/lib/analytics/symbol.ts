const fourCharAlnumPattern = /^[0-9A-Za-z]{4}$/;

export function buildYahooSymbolCandidates(rawSymbol: string): string[] {
  const symbol = rawSymbol.trim();
  if (!symbol) return [];

  const candidates = [symbol];

  if (fourCharAlnumPattern.test(symbol)) {
    const tokyoCandidate = `${symbol.toUpperCase()}.T`;
    const hasCandidate = candidates.some(
      (candidate) => candidate.toUpperCase() === tokyoCandidate,
    );

    if (!hasCandidate) {
      candidates.push(tokyoCandidate);
    }
  }

  return candidates;
}
