import { describe, expect, it } from "vitest";
import { buildCardSearchText } from "@/lib/card-search-text";

describe("buildCardSearchText", () => {
  it("concatenates searchable fields in lowercase", () => {
    expect(
      buildCardSearchText({
        player: "LeBron James",
        team: "Lakers",
        year: "2023",
        brand: "Panini",
        set: "Prizm",
        variation: "Silver",
        cardNumber: "1",
        serialNumber: "10/99",
      })
    ).toBe(
      "lebron james lakers 2023 panini prizm silver 1 10/99"
    );
  });
});
