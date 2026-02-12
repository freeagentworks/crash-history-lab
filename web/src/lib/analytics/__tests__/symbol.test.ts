import { describe, expect, it } from "vitest";
import { buildYahooSymbolCandidates } from "../symbol";

describe("buildYahooSymbolCandidates", () => {
  it("adds .T fallback for 4-digit Japanese stock code", () => {
    expect(buildYahooSymbolCandidates("7203")).toEqual(["7203", "7203.T"]);
  });

  it("adds .T fallback for 4-char alphanumeric code", () => {
    expect(buildYahooSymbolCandidates("130A")).toEqual(["130A", "130A.T"]);
  });

  it("keeps explicit exchange suffix as-is", () => {
    expect(buildYahooSymbolCandidates("7203.T")).toEqual(["7203.T"]);
  });

  it("does not alter index symbols", () => {
    expect(buildYahooSymbolCandidates("^N225")).toEqual(["^N225"]);
  });
});
