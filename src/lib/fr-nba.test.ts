import { describe, expect, it } from "vitest";
import {
  computeFrNbaCollectionStats,
  deriveRpaObjectiveFromLegacy,
  formatFrNbaHoldingLabel,
  legacyFrNbaRowToHoldings,
  playerHasHoldingType,
} from "./fr-nba";
import type { FrNbaPlayer } from "./types";
import type { FrNbaHoldingLabels } from "./fr-nba";

const labels: FrNbaHoldingLabels = {
  types: {
    auto: "Auto",
    patch: "Patch",
    rpa: "RPA",
    immaculate: "Immaculate",
  },
  autoStyles: {
    on_card: "On-card",
    sticker: "Sticker",
  },
  rookie: "RC",
};

function samplePlayer(overrides: Partial<FrNbaPlayer> = {}): FrNbaPlayer {
  return {
    id: 1,
    player: "Test Player",
    draftYear: "2023",
    draftedBy: "Team",
    rpa: null,
    holdings: [],
    ...overrides,
  };
}

describe("legacyFrNbaRowToHoldings", () => {
  it("creates an RPA holding when rookie, patch and auto are all set", () => {
    expect(
      legacyFrNbaRowToHoldings({
        rookieCard: true,
        auto: "On card",
        patch: true,
        immaculate: null,
      })
    ).toEqual([
      { type: "rpa", autoStyle: "on_card", rookie: true },
    ]);
  });

  it("creates separate auto and patch holdings when incomplete", () => {
    expect(
      legacyFrNbaRowToHoldings({
        rookieCard: true,
        auto: "Sticker",
        patch: false,
        immaculate: false,
      })
    ).toEqual([
      { type: "auto", autoStyle: "sticker", rookie: true },
    ]);
  });

  it("adds an Immaculate holding independently", () => {
    const holdings = legacyFrNbaRowToHoldings({
      rookieCard: false,
      auto: null,
      patch: false,
      immaculate: true,
    });
    expect(holdings).toEqual([
      { type: "immaculate", autoStyle: null, rookie: false },
    ]);
  });
});

describe("formatFrNbaHoldingLabel", () => {
  it("formats a full RPA chip", () => {
    expect(
      formatFrNbaHoldingLabel(
        { id: 1, type: "rpa", autoStyle: "on_card", rookie: true },
        labels
      )
    ).toBe("RPA · On-card");
  });

  it("still shows RC on standalone auto holdings", () => {
    expect(
      formatFrNbaHoldingLabel(
        { id: 1, type: "auto", autoStyle: "sticker", rookie: true },
        labels
      )
    ).toBe("Auto · Sticker · RC");
  });
});

describe("computeFrNbaCollectionStats", () => {
  it("aggregates RPA objective and holdings", () => {
    const stats = computeFrNbaCollectionStats([
      samplePlayer({
        id: 1,
        rpa: true,
        holdings: [
          { id: 1, type: "rpa", autoStyle: "on_card", rookie: true },
          { id: 2, type: "immaculate", autoStyle: null, rookie: false },
        ],
      }),
      samplePlayer({ id: 2, rpa: false, holdings: [] }),
    ]);

    expect(stats.rpaAcquired).toBe(1);
    expect(stats.rpaMissing).toBe(1);
    expect(stats.immaculateCount).toBe(1);
    expect(stats.holdingsCount).toBe(2);
  });
});

describe("deriveRpaObjectiveFromLegacy", () => {
  it("returns true when legacy row represents a full RPA", () => {
    expect(
      deriveRpaObjectiveFromLegacy({
        rookieCard: true,
        auto: "Sticker",
        patch: true,
      })
    ).toBe(true);
  });
});

describe("playerHasHoldingType", () => {
  it("detects immaculate holdings", () => {
    expect(
      playerHasHoldingType(
        samplePlayer({
          holdings: [
            { id: 1, type: "immaculate", autoStyle: null, rookie: false },
          ],
        }),
        "immaculate"
      )
    ).toBe(true);
  });
});
